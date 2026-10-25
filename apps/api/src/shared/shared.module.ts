import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { EVENT_PUBLISHER } from './application/event-publisher';
import { LoggingEventPublisher } from '../events/logging-event-publisher';
import { TransactionConflictFilter } from './api/transaction-conflict.filter';

@Global()
@Module({
  providers: [
    { provide: EVENT_PUBLISHER, useClass: LoggingEventPublisher },
    { provide: APP_FILTER, useClass: TransactionConflictFilter },
  ],
  exports: [EVENT_PUBLISHER],
})
export class SharedModule {}
