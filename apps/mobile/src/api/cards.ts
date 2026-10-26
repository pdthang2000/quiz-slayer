import { request } from './client';
import type { Card, CardFilter, CardVersion, Page, TagWithCount } from './types';

export type CardInput = { front: string; back: string; tags: string[] };

// Card Library endpoints (apps/api/src/card-library/api). Versions go in If-Match (CONFLICT-01).
export const cardsApi = {
  /** READ-02, READ-03, READ-05: newest first, 20 per page. */
  list: (filter: CardFilter, cursor?: string) =>
    request<Page<Card>>('GET', '/cards', {
      query: { q: filter.search, tag: filter.tagIds, cursor },
    }),

  get: (id: string) => request<Card>('GET', `/cards/${id}`),

  /** TAG-05: unknown tag names are created by the server. */
  create: (input: CardInput) => request<Card>('POST', '/cards', { body: input }),

  /** CARD-07: one Save; CARD-08: the version the editor was shown. */
  edit: (card: { id: string; version: number }, input: CardInput) =>
    request<Card>('PUT', `/cards/${card.id}`, {
      body: input,
      version: card.version,
    }),

  /** TRASH-01, UI-13: returns the new version, which Undo sends back. */
  moveToTrash: (card: { id: string; version: number }) =>
    request<CardVersion>('POST', `/cards/${card.id}/trash`, {
      version: card.version,
    }),

  /** TRASH-04 (UI-13 Undo). */
  restore: (card: { id: string; version: number }) =>
    request<CardVersion>('POST', `/trash/${card.id}/restore`, {
      version: card.version,
    }),

  /** UI-14 (slice 4b). */
  tagsOf: (id: string) => request<TagWithCount[]>('GET', `/cards/${id}/tags`),
};

export const tagsApi = {
  /** READ-04: A–Z with Active counts. Also the autocomplete source (UI-02). */
  list: () => request<TagWithCount[]>('GET', '/tags'),
};
