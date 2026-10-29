import { request } from './client';
import type { CardVersion, EmptyTrashInput, TrashPage } from './types';

// Trash endpoints (apps/api/src/card-library/api/trash.controller.ts). Restore is cardsApi.restore.
export const trashApi = {
  /** TRASH-12: most recently trashed first, 20 per page, with the total. */
  list: (cursor?: string) => request<TrashPage>('GET', '/trash', { query: { cursor } }),

  /** TRASH-05: no undo. CARD-08: the version the Trash tab showed. */
  deletePermanently: (card: CardVersion) =>
    request<void>('DELETE', `/trash/${card.id}`, { version: card.version }),

  /** TRASH-07, TRASH-11: sends the count and newest "trashed at" the dialog showed. */
  empty: (input: EmptyTrashInput) => request<void>('POST', '/trash/empty', { body: input }),
};
