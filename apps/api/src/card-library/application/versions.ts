import { CardId, TagId } from '../domain/ids';

// CONFLICT-01: what a command returns, so the screen can send it with its next change.

export type CardVersion = { id: CardId; version: number };
export type TagVersion = { id: TagId; version: number };
