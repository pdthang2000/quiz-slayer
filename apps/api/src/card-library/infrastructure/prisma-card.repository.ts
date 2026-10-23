import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Card } from '../domain/card';
import { CardRepository } from '../domain/card-repository';
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
    return this.prisma.runInTransaction(() => this.write(card));
  }

  saveAll(cards: Card[]): Promise<void> {
    return this.prisma.runInTransaction(async () => {
      for (const card of cards) await this.write(card);
    });
  }

  /** TRASH-05: the card_tag rows go with it (ON DELETE CASCADE). */
  async delete(card: Card): Promise<void> {
    await this.prisma.db.card.deleteMany({
      where: { id: card.id, userId: card.userId },
    });
  }

  /** Writes the card row and makes its CardTags match card.tagIds. */
  private async write(card: Card): Promise<void> {
    const db = this.prisma.db;
    const tagIds = card.tagIds;
    const data = toCardData(card);
    await db.card.upsert({
      where: { id: card.id },
      create: { id: card.id, userId: card.userId, ...data },
      update: data,
    });
    await db.cardTag.deleteMany({
      where: { cardId: card.id, tagId: { notIn: tagIds } },
    });
    if (tagIds.length > 0) {
      await db.cardTag.createMany({
        data: tagIds.map((tagId) => ({ cardId: card.id, tagId })),
        skipDuplicates: true,
      });
    }
  }
}
