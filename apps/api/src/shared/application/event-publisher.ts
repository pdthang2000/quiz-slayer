/** Publishes domain events after the transaction that produced them has committed. */
export interface EventPublisher {
  publish(events: readonly { type: string }[]): void;
}

export const EVENT_PUBLISHER = Symbol('EventPublisher');
