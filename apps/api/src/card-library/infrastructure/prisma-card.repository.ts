import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Card } from '../domain/card';
import { CardRepository } from '../domain/card-repository';
import { CardChanged, TagNoLongerExists } from '../domain/errors';
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

  /** TRASH-11, ADR-010 */
  async listTrashed(userId: UserId): Promise<Card[]> {
    const rows = await this.prisma.db.card.findMany({
      where: { userId, state: 'Trashed' },
      include: cardInclude,
      orderBy: { id: 'asc' },
    });
    return rows.map(toCard);
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

  add(card: Card): Promise<void> {
    return this.addAll([card]);
  }

  /** New cards start at version 0 (CARD-08). */
  addAll(cards: Card[]): Promise<void> {
    if (cards.length === 0) return Promise.resolve();
    return this.prisma.runInTransaction(async () => {
      await this.prisma.db.card.createMany({
        data: cards.map((card) => ({
          id: card.id,
          userId: card.userId,
          ...toCardData(card),
          version: 0,
        })),
      });
      await this.replaceCardTags(cards);
    });
  }

  save(card: Card): Promise<void> {
    return this.saveAll([card]);
  }

  /**
   * CARD-08: one conditional update per card (WHERE version = loaded version, then +1),
   * then the CardTags in bulk. 0 rows updated → CardChanged and the transaction rolls back.
   */
  saveAll(cards: Card[]): Promise<void> {
    if (cards.length === 0) return Promise.resolve();
    return this.prisma.runInTransaction(async () => {
      for (const card of cards) {
        const { count } = await this.prisma.db.card.updateMany({
          where: { id: card.id, userId: card.userId, version: card.version },
          data: { ...toCardData(card), version: { increment: 1 } },
        });
        if (count === 0) throw new CardChanged(card.id);
      }
      await this.replaceCardTags(cards);
    });
  }

  /**
   * One deleteMany and one createMany for all cards. user_id goes into card_tag,
   * so the DB rejects another user's tag (C-22).
   */
  private async replaceCardTags(cards: Card[]): Promise<void> {
    const db = this.prisma.db;
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
  }

  delete(card: Card): Promise<void> {
    return this.deleteAll([card]);
  }

  /**
   * TRASH-05: the card_tag rows go with them (ON DELETE CASCADE). Only rows still Trashed
   * are deleted, so a card restored on another device meanwhile survives (TRASH-09).
   */
  async deleteAll(cards: Card[]): Promise<void> {
    if (cards.length === 0) return;
    await this.prisma.db.card.deleteMany({
      where: {
        id: { in: cards.map((c) => c.id) },
        userId: cards[0].userId,
        state: 'Trashed',
      },
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
