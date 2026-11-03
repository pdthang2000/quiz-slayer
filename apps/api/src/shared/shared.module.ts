import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EVENT_PUBLISHER } from './application/event-publisher';
import { LoggingEventPublisher } from '../events/logging-event-publisher';
import { TransactionConflictFilter } from './api/transaction-conflict.filter';
import { OUTBOX, OUTBOX_HANDLERS } from './application/outbox';
import { OutboxRelay } from '../prisma/outbox-relay';

@Global()
@Module({
  providers: [
    { provide: EVENT_PUBLISHER, useClass: LoggingEventPublisher },
    { provide: APP_FILTER, useClass: TransactionConflictFilter },
    OutboxRelay,
    { provide: OUTBOX, useExisting: OutboxRelay },
    { provide: OUTBOX_HANDLERS, useExisting: OutboxRelay },
  ],
  exports: [EVENT_PUBLISHER, OUTBOX, OUTBOX_HANDLERS, OutboxRelay],
})
export class SharedModule {}
