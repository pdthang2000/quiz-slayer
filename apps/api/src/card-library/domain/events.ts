import { CardId, TagId, UserId } from './ids';

export type CardCreated = {
  readonly type: 'CardCreated';
  readonly cardId: CardId;
  readonly userId: UserId;
  readonly tagIds: readonly TagId[];
};
export type CardEdited = {
  readonly type: 'CardEdited';
  readonly cardId: CardId;
  readonly userId: UserId;
};
export type CardTagged = {
  readonly type: 'CardTagged';
  readonly cardId: CardId;
  readonly userId: UserId;
  readonly tagId: TagId;
};
export type CardUntagged = {
  readonly type: 'CardUntagged';
  readonly cardId: CardId;
  readonly userId: UserId;
  readonly tagId: TagId;
};
export type CardMovedToTrash = {
  readonly type: 'CardMovedToTrash';
  readonly cardId: CardId;
  readonly userId: UserId;
};
export type CardRestored = {
  readonly type: 'CardRestored';
  readonly cardId: CardId;
  readonly userId: UserId;
};
export type CardDeletedPermanently = {
  readonly type: 'CardDeletedPermanently';
  readonly cardId: CardId;
  readonly userId: UserId;
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
  readonly type: 'TagCreated';
  readonly tagId: TagId;
  readonly userId: UserId;
  readonly name: string;
};
export type TagRenamed = {
  readonly type: 'TagRenamed';
  readonly tagId: TagId;
  readonly userId: UserId;
  readonly from: string;
  readonly to: string;
};
export type TagDeleted = {
  readonly type: 'TagDeleted';
  readonly tagId: TagId;
  readonly userId: UserId;
};
/** TAG-10: one event for the whole merge, no per-card CardTagged / CardUntagged. */
export type TagsMerged = {
  readonly type: 'TagsMerged';
  readonly userId: UserId;
  readonly tagId: TagId;
  readonly intoTagId: TagId;
};

export type TagEvent = TagCreated | TagRenamed | TagDeleted | TagsMerged;
