import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Card } from '../domain/card';
import { CardRepository } from '../domain/card-repository';
import { TagNoLongerExists } from '../domain/errors';
import { CardId, TagId, UserId } from '../domain/ids';
import { cardInclude, toCard, toCardData } from './card.mapper';

@Injectable()
export class PrismaCardRepository implements CardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** READ-01 */
  async findActive(userId: UserId, cardId: CardId): Promise<Card | null> {
    const row = await this.prisma.db.card.findFirst({
      where: { id: cardId, userId, state: 'Active' },
      include: cardInclude,
    });
    return row ? toCard(row) : null;
  }

  /** READ-01 */
  async findTrashed(userId: UserId, cardId: CardId): Promise<Card | null> {
    const row = await this.prisma.db.card.findFirst({
      where: { id: cardId, userId, state: 'Trashed' },
      include: cardInclude,
    });
    return row ? toCard(row) : null;
  }

  /** TAG-09, TAG-10: Active and Trashed, for a merge only. */
  async findByTag(userId: UserId, tagId: TagId): Promise<Card[]> {
    const rows = await this.prisma.db.card.findMany({
      where: { userId, tags: { some: { tagId } } },
      include: cardInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toCard);
  }

  save(card: Card): Promise<void> {
    return this.saveAll([card]);
  }

  /**
   * One upsert per card, then the CardTags of all cards in bulk: one deleteMany and one
   * createMany. user_id goes into card_tag, so the DB rejects another user's tag (C-22).
   */
  saveAll(cards: Card[]): Promise<void> {
    if (cards.length === 0) return Promise.resolve();
    return this.prisma.runInTransaction(async () => {
      const db = this.prisma.db;
      for (const card of cards) {
        const data = toCardData(card);
        await db.card.upsert({
          where: { id: card.id },
          create: { id: card.id, userId: card.userId, ...data },
          update: data,
        });
      }
      await db.cardTag.deleteMany({
        where: { cardId: { in: cards.map((c) => c.id) } },
      });
      const rows = cards.flatMap((card) =>
        card.tagIds.map((tagId) => ({
          cardId: card.id,
          tagId,
          userId: card.userId,
        })),
      );
      if (rows.length === 0) return;
      try {
        await db.cardTag.createMany({ data: rows });
      } catch (error) {
        if (isTagForeignKeyViolation(error)) {
          throw new TagNoLongerExists(cards.map((c) => c.id));
        }
        throw error;
      }
    });
  }

  /** TRASH-05: the card_tag rows go with it (ON DELETE CASCADE). */
  async delete(card: Card): Promise<void> {
    await this.prisma.db.card.deleteMany({
      where: { id: card.id, userId: card.userId },
    });
  }
}

/** P2003 on card_tag's (tag_id, user_id) foreign key (C-21). */
function isTagForeignKeyViolation(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2003'
  ) {
    return false;
  }
  return JSON.stringify(error.meta ?? {}).includes('card_tag_tag_fkey');
}
