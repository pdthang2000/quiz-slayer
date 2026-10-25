import { CardId, TagId, UserId } from '../domain/ids';
import { TagColorKey } from '../domain/tag-color';

// Read side: plain data for screens, not aggregates. Infrastructure implements this
// interface; it is the only part of application/ that infrastructure may import (CLAUDE.md).

export type TagSummary = { id: TagId; name: string; color: TagColorKey };

export type CardSummary = {
  id: CardId;
  front: string;
  back: string;
  tags: TagSummary[];
  createdAt: Date;
};

export type TrashedCardSummary = CardSummary & { trashedAt: Date };

export type TagWithCount = TagSummary & { cardCount: number };

/** "Load more" paging (READ-02, TRASH-12). `cursor` is opaque to callers. */
export type Page<T> = { items: T[]; nextCursor: string | null };

export const PAGE_SIZE = 20;

/** READ-01: every read names the card state it wants. */
export interface CardLibraryQueries {
  /** READ-01, READ-02, READ-03, READ-05: Active cards, newest created first. */
  listActiveCards(
    userId: UserId,
    filter: { search?: string; tagIds?: TagId[]; cursor?: string },
  ): Promise<Page<CardSummary>>;
  /** READ-01: card detail is Active only. */
  findActiveCard(userId: UserId, cardId: CardId): Promise<CardSummary | null>;
  /** TRASH-12: most recently trashed first, with the total for the TRASH-07 dialog. */
  listTrashedCards(
    userId: UserId,
    cursor?: string,
  ): Promise<Page<TrashedCardSummary> & { total: number }>;
  /** READ-04: A–Z, ignoring case and accents. cardCount = Active cards (READ-01, TRASH-03). */
  listTagsWithActiveCounts(userId: UserId): Promise<TagWithCount[]>;
  /** TAG-15: Active cards that have at least one of these tags. */
  countActiveCardsWithAnyTag(userId: UserId, tagIds: TagId[]): Promise<number>;
}
