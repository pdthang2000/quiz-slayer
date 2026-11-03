/** A domain event as it is stored: a `type` plus plain JSON data. */
export type OutboxEvent = { readonly type: string };

/**
 * B-10: saves domain events in the current transaction. They are delivered to their
 * handlers after commit (OutboxRelay), at least once; handlers must be idempotent.
 */
export interface Outbox {
  /** Must run inside a transaction, with the change that raised the events. */
  add(events: readonly OutboxEvent[]): Promise<void>;
  /** Ask for delivery now instead of at the next poll. Never throws. */
  deliverSoon(): void;
}

export const OUTBOX = Symbol('Outbox');

/** Reacts to one event type. Runs in its own transaction, together with "delivered". */
export type OutboxHandler = (event: OutboxEvent) => Promise<void>;

/** Where contexts register what they react to (e.g. Daily Practice: QuizAnswered). */
export interface OutboxHandlers {
  register(type: string, handler: OutboxHandler): void;
}

export const OUTBOX_HANDLERS = Symbol('OutboxHandlers');
