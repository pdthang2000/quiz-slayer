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

/** CARDTAG-08: a card in the "+ Add cards" picker. `atTagLimit`: it already has 20 tags. */
export type TagPickerCard = Card & { atTagLimit: boolean };

/** What adding or removing cards through a tag's list returns: the new versions. */
export type TagCards = { tag: CardVersion; cards: CardVersion[] };

/** TAG-15: the merge preview carried by 409 TagMergeNeedsConfirmation. Active cards only. */
export type MergePreview = {
  /** null: nobody holds the name any more (C-38); the app asks for a plain rename. */
  into: string | null;
  intoId: string | null;
  intoCount: number;
  fromCount: number;
  resultCount: number;
};
