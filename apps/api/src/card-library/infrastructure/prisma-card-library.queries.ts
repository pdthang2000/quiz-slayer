import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CardLibraryQueries,
  CardSummary,
  Page,
  PAGE_SIZE,
  TagWithCount,
  TrashedCardSummary,
} from '../domain/card-library-queries';
import { CardId, TagId, UserId } from '../domain/ids';
import { TagColorKey } from '../domain/tag-color';

const summaryInclude = {
  tags: { select: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.CardInclude;

type SummaryRow = Prisma.CardGetPayload<{ include: typeof summaryInclude }>;

/** Cursor = "<epoch millis>_<uuid>" of the last item; validated by the API DTOs. */
function encodeCursor(at: Date, id: string): string {
  return `${at.getTime()}_${id}`;
}

function decodeCursor(cursor: string): { at: Date; id: string } {
  const [millis, id] = cursor.split('_');
  return { at: new Date(Number(millis)), id };
}

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
    tags: row.tags
      .map(({ tag }) => ({
        id: TagId(tag.id),
        name: tag.name,
        color: tag.color as TagColorKey,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

@Injectable()
export class PrismaCardLibraryQueries implements CardLibraryQueries {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveCards(
    userId: UserId,
    filter: { search?: string; tagIds?: TagId[]; cursor?: string },
  ): Promise<Page<CardSummary>> {
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
    // READ-02: newest created first, "load more" after the cursor.
    if (filter.cursor) {
      const { at, id } = decodeCursor(filter.cursor);
      conditions.push(Prisma.sql`(c.created_at, c.id) < (${at}, ${id}::uuid)`);
    }
    const ids = await this.prisma.db.$queryRaw<{ id: string }[]>`
      SELECT c.id FROM card c
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT ${PAGE_SIZE + 1}`;

    const pageIds = ids.slice(0, PAGE_SIZE).map((r) => r.id);
    const rows = await this.prisma.db.card.findMany({
      where: { id: { in: pageIds } },
      include: summaryInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const items = pageIds.map((id) => toSummary(byId.get(id)!));
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        ids.length > PAGE_SIZE && last
          ? encodeCursor(last.createdAt, last.id)
          : null,
    };
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
  ): Promise<Page<TrashedCardSummary> & { total: number }> {
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
    const total = await this.prisma.db.card.count({ where });
    const items = rows.slice(0, PAGE_SIZE).map((row) => ({
      ...toSummary(row),
      trashedAt: row.trashedAt!,
    }));
    const last = items.at(-1);
    return {
      items,
      total,
      nextCursor:
        rows.length > PAGE_SIZE && last
          ? encodeCursor(last.trashedAt, last.id)
          : null,
    };
  }

  async listTagsWithActiveCounts(userId: UserId): Promise<TagWithCount[]> {
    const rows = await this.prisma.db.$queryRaw<
      { id: string; name: string; color: string; cardCount: number }[]
    >`
      SELECT t.id, t.name, t.color, count(c.id)::int AS "cardCount"
      FROM tag t
      LEFT JOIN card_tag ct ON ct.tag_id = t.id
      LEFT JOIN card c ON c.id = ct.card_id AND c.state = 'Active'::card_state
      WHERE t.user_id = ${userId}::uuid
      GROUP BY t.id
      ORDER BY t.name COLLATE "und-x-icu", t.id`; // READ-04
    return rows.map((r) => ({
      id: TagId(r.id),
      name: r.name,
      color: r.color as TagColorKey,
      cardCount: r.cardCount,
    }));
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
}
