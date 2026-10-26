// Response shapes of the QuizSlayer API (apps/api), written by hand (ADR-012).
// Keep in step with apps/api/src/card-library/application/card-library-queries.ts.

export type TagColorKey =
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'brown'
  | 'slate';

export type Tag = {
  id: string;
  name: string;
  color: TagColorKey;
  /** TAG-16: send it in If-Match with a rename, delete or tag-list change. */
  version: number;
};

export type TagWithCount = Tag & { cardCount: number };

export type Card = {
  id: string;
  front: string;
  back: string;
  /** READ-06 order (A–Z), as the server sends it. */
  tags: Tag[];
  /** UTC ISO string. */
  createdAt: string;
  /** CARD-08: send it in If-Match with any change to this card. */
  version: number;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

/** What a card change returns (CONFLICT-01). */
export type CardVersion = { id: string; version: number };

/** READ-03 + READ-05: the card list's filter (also Study's, STUDY-01). */
export type CardFilter = { search?: string; tagIds?: string[] };
