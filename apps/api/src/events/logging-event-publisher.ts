import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '../shared/application/event-publisher';

/** No listeners yet (Daily Practice comes in Phase 6), so events are only logged. */
@Injectable()
export class LoggingEventPublisher implements EventPublisher {
  private readonly logger = new Logger('DomainEvents');

  publish(events: readonly { type: string }[]): void {
    for (const event of events) this.logger.debug(JSON.stringify(event));
  }
}
