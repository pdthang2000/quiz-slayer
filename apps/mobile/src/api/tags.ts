import { request } from './client';
import type {
  CardVersion,
  Page,
  TagCards,
  TagPickerCard,
  TagWithCount,
} from './types';

type TagRef = { id: string; version: number };

// Tag endpoints (apps/api/src/card-library/api/tags.controller.ts). The tag's version goes
// in If-Match (TAG-16); each card's version goes in the body (CARD-08).
export const tagsApi = {
  /** READ-04: A–Z with Active counts. Also the autocomplete source (UI-02). */
  list: () => request<TagWithCount[]>('GET', '/tags'),

  /**
   * TAG-11 rename. TAG-15: renaming onto an existing name answers 409
   * TagMergeNeedsConfirmation with the preview; resend with `confirmMerge: true`.
   * Returns the tag that carries the name afterwards (the target after a merge).
   */
  rename: (tag: TagRef, name: string, confirmMerge = false) =>
    request<CardVersion>('PATCH', `/tags/${tag.id}`, {
      body: confirmMerge ? { name, confirmMerge: true } : { name },
      version: tag.version,
    }),

  /** TAG-06 */
  delete: (tag: TagRef) =>
    request<void>('DELETE', `/tags/${tag.id}`, { version: tag.version }),

  /** CARDTAG-08: the "+ Add cards" picker, newest first, 20 per page. */
  cardsToAdd: (tagId: string, search: string, cursor?: string) =>
    request<Page<TagPickerCard>>('GET', `/tags/${tagId}/cards-to-add`, {
      query: { q: search, cursor },
    }),

  /** CARDTAG-08, all or nothing (ADR-011). */
  addCards: (tag: TagRef, cards: CardVersion[]) =>
    request<TagCards>('POST', `/tags/${tag.id}/cards`, {
      body: { cards: cards.map((c) => ({ cardId: c.id, version: c.version })) },
      version: tag.version,
    }),

  /** CARDTAG-07, all or nothing (ADR-011). */
  removeCards: (tag: TagRef, cards: CardVersion[]) =>
    request<TagCards>('POST', `/tags/${tag.id}/cards/remove`, {
      body: { cards: cards.map((c) => ({ cardId: c.id, version: c.version })) },
      version: tag.version,
    }),
};

/** CARDTAG-07, CARDTAG-08: at most 100 cards per add or remove, checked by the app too. */
export const MAX_CARDS_PER_ACTION = 100;
