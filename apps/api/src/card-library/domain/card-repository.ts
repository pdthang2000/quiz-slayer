import { Card } from './card';
import { CardId, TagId, UserId } from './ids';

/**
 * READ-01: every read names the card state it wants. There is no findAll.
 * Transactions (TAG-10) are handled by the infrastructure in Phase 2.
 */
export interface CardRepository {
  findActive(userId: UserId, cardId: CardId): Promise<Card | null>;
  findTrashed(userId: UserId, cardId: CardId): Promise<Card | null>;
  /** Active and Trashed cards with this tag. For a tag merge only (TAG-09, TAG-10). */
  findByTag(userId: UserId, tagId: TagId): Promise<Card[]>;
  save(card: Card): Promise<void>;
  saveAll(cards: Card[]): Promise<void>;
  /** TRASH-05: removes the card and its CardTags. */
  delete(card: Card): Promise<void>;
}
