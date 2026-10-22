/** Collects domain events until the application layer pulls and publishes them. */
export abstract class AggregateRoot<TEvent> {
  private events: TEvent[] = [];

  protected record(event: TEvent): void {
    this.events.push(event);
  }

  pullEvents(): TEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }
}
