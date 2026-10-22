import { CardId, TagId, UserId } from './ids';

export type CardCreated = {
  type: 'CardCreated';
  cardId: CardId;
  userId: UserId;
  tagIds: TagId[];
};
export type CardEdited = { type: 'CardEdited'; cardId: CardId; userId: UserId };
export type CardTagged = {
  type: 'CardTagged';
  cardId: CardId;
  userId: UserId;
  tagId: TagId;
};
export type CardUntagged = {
  type: 'CardUntagged';
  cardId: CardId;
  userId: UserId;
  tagId: TagId;
};
export type CardMovedToTrash = {
  type: 'CardMovedToTrash';
  cardId: CardId;
  userId: UserId;
};
export type CardRestored = {
  type: 'CardRestored';
  cardId: CardId;
  userId: UserId;
};
export type CardDeletedPermanently = {
  type: 'CardDeletedPermanently';
  cardId: CardId;
  userId: UserId;
};

export type CardEvent =
  | CardCreated
  | CardEdited
  | CardTagged
  | CardUntagged
  | CardMovedToTrash
  | CardRestored
  | CardDeletedPermanently;

export type TagCreated = {
  type: 'TagCreated';
  tagId: TagId;
  userId: UserId;
  name: string;
};
export type TagRenamed = {
  type: 'TagRenamed';
  tagId: TagId;
  userId: UserId;
  from: string;
  to: string;
};
export type TagDeleted = { type: 'TagDeleted'; tagId: TagId; userId: UserId };
/** TAG-10: one event for the whole merge, no per-card CardTagged / CardUntagged. */
export type TagsMerged = {
  type: 'TagsMerged';
  userId: UserId;
  tagId: TagId;
  intoTagId: TagId;
};

export type TagEvent = TagCreated | TagRenamed | TagDeleted | TagsMerged;
