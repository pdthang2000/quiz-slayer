import { Card } from './card';
import { CardId, TagId, UserId } from './ids';

/**
 * READ-01: every read names the card state it wants. There is no findAll.
 * Transactions: ADR-008 (no tx parameter; the infrastructure joins the current one).
 */
export interface CardRepository {
  findActive(userId: UserId, cardId: CardId): Promise<Card | null>;
  findTrashed(userId: UserId, cardId: CardId): Promise<Card | null>;
  /** Every trashed card of the user. For empty trash only (TRASH-11, ADR-010). */
  listTrashed(userId: UserId): Promise<Card[]>;
  /** Active and Trashed cards with this tag. For a tag merge only (TAG-09, TAG-10). */
  findByTag(userId: UserId, tagId: TagId): Promise<Card[]>;
  /**
   * Inserts a new card (from Card.create) at version 0.
   * Throws TagNoLongerExists if a tag id is gone or not the user's (CARD-04, C-21).
   */
  add(card: Card): Promise<void>;
  /** Same as add, in bulk. */
  addAll(cards: Card[]): Promise<void>;
  /**
   * Updates a loaded card only if its stored version is still the one it was loaded at,
   * then bumps the version; otherwise throws CardChanged (CARD-08). Save a loaded card once.
   * Throws TagNoLongerExists like add.
   */
  save(card: Card): Promise<void>;
  /** Same as save, in bulk (TAG-10 merges can touch thousands of cards). */
  saveAll(cards: Card[]): Promise<void>;
  /**
   * TRASH-05: removes the card and its CardTags, only while it is still Trashed (TRASH-09)
   * and at the loaded version (CARD-08); otherwise CardChanged.
   */
  delete(card: Card): Promise<void>;
  /**
   * Empty trash (ADR-010): removes the cards that are still Trashed, skipping any restored
   * meanwhile (TRASH-09). The TRASH-11 check in the same transaction guards the rest.
   */
  deleteAll(cards: Card[]): Promise<void>;
}
