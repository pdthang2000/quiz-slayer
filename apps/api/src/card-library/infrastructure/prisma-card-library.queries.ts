import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CardFilter,
  CardLibraryQueries,
  CardSummary,
  Page,
  PAGE_SIZE,
  TagPickerCard,
  TagWithCount,
  TrashedCardSummary,
  TrashState,
} from '../application/card-library-queries';
import { Card } from '../domain/card';
import { CardId, TagId, UserId } from '../domain/ids';
import { TagColorKey } from '../domain/tag-color';

const summaryInclude = {
  tags: {
    select: {
      tag: { select: { id: true, name: true, color: true, version: true } },
    },
  },
} satisfies Prisma.CardInclude;

type SummaryRow = Prisma.CardGetPayload<{ include: typeof summaryInclude }>;

type TagCountRow = {
  id: string;
  name: string;
  color: string;
  version: number;
  cardCount: number;
};

/** Cursor = "<epoch millis>_<uuid>" of the last item; validated by the API DTOs. */
function encodeCursor(at: Date, id: string): string {
  return `${at.getTime()}_${id}`;
}

function decodeCursor(cursor: string): { at: Date; id: string } {
  const [millis, id] = cursor.split('_');
  return { at: new Date(Number(millis)), id };
}

/** READ-04, READ-06: ICU root collation, the same as "und-x-icu" in the Tag list query. */
const dictionaryOrder = new Intl.Collator('und');

/** LIKE wildcards in user input are matched literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function toSummary(row: SummaryRow): CardSummary {
  return {
    id: CardId(row.id),
    front: row.front,
    back: row.back,
    createdAt: row.createdAt,
    version: row.version,
    tags: row.tags
      .map(({ tag }) => ({
        id: TagId(tag.id),
        name: tag.name,
        color: tag.color as TagColorKey,
        version: tag.version,
      }))
      .sort((a, b) => dictionaryOrder.compare(a.name, b.name)), // READ-06
  };
}

function toTagWithCount(row: TagCountRow): TagWithCount {
  return {
    id: TagId(row.id),
    name: row.name,
    color: row.color as TagColorKey,
    version: row.version,
    cardCount: row.cardCount,
  };
}

/** READ-01 (Active only), READ-03 (search), READ-05 (every selected tag). */
function activeCardConditions(
  userId: UserId,
  filter: CardFilter,
): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`c.user_id = ${userId}::uuid`,
    Prisma.sql`c.state = 'Active'::card_state`, // READ-01, TRASH-03
  ];
  // READ-03: any part of front or back, ignoring case and accents. ADR-003: NFC input.
  const search = filter.search?.normalize('NFC').trim();
  if (search) {
    const pattern = `%${escapeLike(search.toLowerCase())}%`;
    conditions.push(Prisma.sql`(
      unaccent(lower(c.front)) LIKE unaccent(${pattern})
      OR unaccent(lower(c.back)) LIKE unaccent(${pattern}))`);
  }
  // READ-05: cards that have every selected tag.
  const tagIds = [...new Set(filter.tagIds ?? [])];
  if (tagIds.length > 0) {
    conditions.push(Prisma.sql`(
      SELECT count(*) FROM card_tag ct
      WHERE ct.card_id = c.id AND ct.tag_id = ANY(${tagIds}::uuid[])
    ) = ${tagIds.length}`);
  }
  return conditions;
}

@Injectable()
export class PrismaCardLibraryQueries implements CardLibraryQueries {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCards(
    userId: UserId,
    filter: CardFilter & { cursor?: string },
  ): Promise<Page<CardSummary>> {
    return this.pageOfCards(
      activeCardConditions(userId, filter),
      filter.cursor,
      toSummary,
    );
  }

  async listActiveCardIds(
    userId: UserId,
    filter: CardFilter,
  ): Promise<CardId[]> {
    const rows = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM card c
      WHERE ${Prisma.join(activeCardConditions(userId, filter), ' AND ')}
      ORDER BY c.created_at DESC, c.id DESC`; // READ-02 order (STUDY-03 default)
    return rows.map((r) => CardId(r.id));
  }

  async findActiveCardsByIds(
    userId: UserId,
    cardIds: CardId[],
  ): Promise<CardSummary[]> {
    const rows = await this.prisma.db.card.findMany({
      where: { id: { in: cardIds }, userId, state: 'Active' },
      include: summaryInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return cardIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [toSummary(row)] : [];
    });
  }

  listActiveCardsWithoutTag(
    userId: UserId,
    tagId: TagId,
    filter: { search?: string; cursor?: string },
  ): Promise<Page<TagPickerCard>> {
    const conditions = activeCardConditions(userId, filter);
    // NOT EXISTS, not NOT IN: stays correct and uses the card_tag primary key.
    conditions.push(Prisma.sql`NOT EXISTS (
      SELECT 1 FROM card_tag ct
      WHERE ct.card_id = c.id AND ct.tag_id = ${tagId}::uuid)`);
    return this.pageOfCards(conditions, filter.cursor, (row) => ({
      ...toSummary(row),
      atTagLimit: row.tags.length >= Card.MAX_TAGS, // CARDTAG-03
    }));
  }

  async findActiveCard(
    userId: UserId,
    cardId: CardId,
  ): Promise<CardSummary | null> {
    const row = await this.prisma.db.card.findFirst({
      where: { id: cardId, userId, state: 'Active' },
      include: summaryInclude,
    });
    return row ? toSummary(row) : null;
  }

  async listTrashedCards(
    userId: UserId,
    cursor?: string,
  ): Promise<Page<TrashedCardSummary> & TrashState> {
    const where: Prisma.CardWhereInput = { userId, state: 'Trashed' };
    const after = cursor ? decodeCursor(cursor) : null;
    const rows = await this.prisma.db.card.findMany({
      where: after
        ? {
            ...where,
            OR: [
              { trashedAt: { lt: after.at } },
              { trashedAt: after.at, id: { lt: after.id } },
            ],
          }
        : where,
      include: summaryInclude,
      // TRASH-12: most recently trashed first.
      orderBy: [{ trashedAt: 'desc' }, { id: 'desc' }],
      take: PAGE_SIZE + 1,
    });
    // TRASH-11: the dialog sends both back.
    const state = await this.prisma.db.card.aggregate({
      where,
      _count: true,
      _max: { trashedAt: true },
    });
    const items = rows.slice(0, PAGE_SIZE).map((row) => ({
      ...toSummary(row),
      trashedAt: row.trashedAt!,
    }));
    const last = items.at(-1);
    return {
      items,
      total: state._count,
      newestTrashedAt: state._max.trashedAt,
      nextCursor:
        rows.length > PAGE_SIZE && last
          ? encodeCursor(last.trashedAt, last.id)
          : null,
    };
  }

  async listTagsWithActiveCounts(userId: UserId): Promise<TagWithCount[]> {
    const rows = await this.prisma.db.$queryRaw<TagCountRow[]>`
      SELECT t.id, t.name, t.color, t.version, count(c.id)::int AS "cardCount"
      FROM tag t
      LEFT JOIN card_tag ct ON ct.tag_id = t.id
      LEFT JOIN card c ON c.id = ct.card_id AND c.state = 'Active'::card_state
      WHERE t.user_id = ${userId}::uuid
      GROUP BY t.id
      ORDER BY t.name COLLATE "und-x-icu", t.id`; // READ-04
    return rows.map(toTagWithCount);
  }

  async listTagsOfActiveCard(
    userId: UserId,
    cardId: CardId,
  ): Promise<TagWithCount[] | null> {
    const card = await this.prisma.db.card.findFirst({
      where: { id: cardId, userId, state: 'Active' },
      select: { id: true },
    });
    if (!card) return null;
    const rows = await this.prisma.db.$queryRaw<TagCountRow[]>`
      SELECT t.id, t.name, t.color, t.version, count(c.id)::int AS "cardCount"
      FROM card_tag mine
      JOIN tag t ON t.id = mine.tag_id
      LEFT JOIN card_tag ct ON ct.tag_id = t.id
      LEFT JOIN card c ON c.id = ct.card_id AND c.state = 'Active'::card_state
      WHERE mine.card_id = ${cardId}::uuid AND t.user_id = ${userId}::uuid
      GROUP BY t.id
      ORDER BY t.name COLLATE "und-x-icu", t.id`; // READ-06
    return rows.map(toTagWithCount);
  }

  countActiveCardsWithAnyTag(userId: UserId, tagIds: TagId[]): Promise<number> {
    return this.prisma.db.card.count({
      where: {
        userId,
        state: 'Active',
        tags: { some: { tagId: { in: tagIds } } },
      },
    });
  }

  /** READ-02: newest created first, 20 per page, "load more" after the cursor. */
  private async pageOfCards<T extends CardSummary>(
    conditions: Prisma.Sql[],
    cursor: string | undefined,
    toItem: (row: SummaryRow) => T,
  ): Promise<Page<T>> {
    const where = [...conditions];
    if (cursor) {
      const { at, id } = decodeCursor(cursor);
      // UTC on both sides (CLAUDE.md): created_at is a UTC timestamp without time zone,
      // so compare with a UTC timestamp, not a timestamptz shifted by the session time zone.
      where.push(
        Prisma.sql`(c.created_at, c.id) < (${at.toISOString()}::timestamp, ${id}::uuid)`,
      );
    }
    const ids = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM card c
      WHERE ${Prisma.join(where, ' AND ')}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ${PAGE_SIZE + 1}`;

    const pageIds = ids.slice(0, PAGE_SIZE).map((r) => r.id);
    const rows = await this.prisma.db.card.findMany({
      where: { id: { in: pageIds } },
      include: summaryInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds.map((id) => toItem(byId.get(id)!));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        ids.length > PAGE_SIZE && last
          ? encodeCursor(last.createdAt, last.id)
          : null,
    };
  }
}
