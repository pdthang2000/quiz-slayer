import { Card } from './card';
import { CardId, TagId, UserId } from './ids';

/**
 * READ-01: every read names the card state it wants. There is no findAll.
 * Transactions: ADR-008 (no tx parameter; the infrastructure joins the current one).
 */
export interface CardRepository {
  findActive(userId: UserId, cardId: CardId): Promise<Card | null>;
  findTrashed(userId: UserId, cardId: CardId): Promise<Card | null>;
  /** Active and Trashed cards with this tag. For a tag merge only (TAG-09, TAG-10). */
  findByTag(userId: UserId, tagId: TagId): Promise<Card[]>;
  /** Throws TagNoLongerExists if a tag id is gone or not the user's (CARD-04, C-21). */
  save(card: Card): Promise<void>;
  /** Same as save, in bulk (TAG-10 merges can touch thousands of cards). */
  saveAll(cards: Card[]): Promise<void>;
  /** TRASH-05: removes the card and its CardTags. */
  delete(card: Card): Promise<void>;
}
