import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from './application/event-publisher';
import { LoggingEventPublisher } from '../events/logging-event-publisher';

@Global()
@Module({
  providers: [{ provide: EVENT_PUBLISHER, useClass: LoggingEventPublisher }],
  exports: [EVENT_PUBLISHER],
})
export class SharedModule {}
