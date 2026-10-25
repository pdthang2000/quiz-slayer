import { CardId, TagId, UserId } from '../domain/ids';
import { TagColorKey } from '../domain/tag-color';

// Read side: plain data for screens, not aggregates. Infrastructure implements this
// interface; it is the only part of application/ that infrastructure may import (CLAUDE.md).

/** `version`: send it back with a rename or delete (TAG-16). */
export type TagSummary = {
  id: TagId;
  name: string;
  color: TagColorKey;
  version: number;
};

export type CardSummary = {
  id: CardId;
  front: string;
  back: string;
  tags: TagSummary[];
  createdAt: Date;
  /** CARD-08: send it back with an edit. */
  version: number;
};

export type TrashedCardSummary = CardSummary & { trashedAt: Date };

/** CARDTAG-08: a card in the tag's picker. `atTagLimit`: it already has 20 tags (greyed out). */
export type TagPickerCard = CardSummary & { atTagLimit: boolean };

/** READ-03 + READ-05: what the card list (and Study, STUDY-01) filters by. */
export type CardFilter = { search?: string; tagIds?: TagId[] };

export type TagWithCount = TagSummary & { cardCount: number };

/** TRASH-07, TRASH-11: what the empty-trash dialog shows and sends back. */
export type TrashState = { total: number; newestTrashedAt: Date | null };

/** "Load more" paging (READ-02, TRASH-12). `cursor` is opaque to callers. */
export type Page<T> = { items: T[]; nextCursor: string | null };

export const PAGE_SIZE = 20;

/** READ-01: every read names the card state it wants. */
export interface CardLibraryQueries {
  /** READ-01, READ-02, READ-03, READ-05: Active cards, newest created first. */
  listActiveCards(
    userId: UserId,
    filter: CardFilter & { cursor?: string },
  ): Promise<Page<CardSummary>>;
  /** STUDY-01, STUDY-02: ids of every Active card matching the filter, newest first. No limit (STUDY-06). */
  listActiveCardIds(userId: UserId, filter: CardFilter): Promise<CardId[]>;
  /** STUDY-02: Active cards with these ids, in the given order; trashed or missing ids are left out. */
  findActiveCardsByIds(
    userId: UserId,
    cardIds: CardId[],
  ): Promise<CardSummary[]>;
  /** CARDTAG-08: Active cards that do not have the tag, newest first, with search (READ-03). */
  listActiveCardsWithoutTag(
    userId: UserId,
    tagId: TagId,
    filter: { search?: string; cursor?: string },
  ): Promise<Page<TagPickerCard>>;
  /** UI-14: an Active card's tags with their Active counts, READ-06 order. null: no such Active card. */
  listTagsOfActiveCard(
    userId: UserId,
    cardId: CardId,
  ): Promise<TagWithCount[] | null>;
  /** READ-01: card detail is Active only. */
  findActiveCard(userId: UserId, cardId: CardId): Promise<CardSummary | null>;
  /** TRASH-12: most recently trashed first, with the total for the TRASH-07 dialog. */
  listTrashedCards(
    userId: UserId,
    cursor?: string,
  ): Promise<Page<TrashedCardSummary> & TrashState>;
  /** READ-04: A–Z, ignoring case and accents. cardCount = Active cards (READ-01, TRASH-03). */
  listTagsWithActiveCounts(userId: UserId): Promise<TagWithCount[]>;
  /** TAG-15: Active cards that have at least one of these tags. */
  countActiveCardsWithAnyTag(userId: UserId, tagIds: TagId[]): Promise<number>;
}
