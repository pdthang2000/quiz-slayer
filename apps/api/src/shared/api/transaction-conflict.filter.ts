import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TransactionConflict } from '../application/transaction-conflict';

/** B-11: retries ran out. 409 so the app says "Try again." instead of a crash. */
@Catch(TransactionConflict)
export class TransactionConflictFilter implements ExceptionFilter {
  private readonly logger = new Logger(TransactionConflictFilter.name);

  catch(error: TransactionConflict, host: ArgumentsHost): void {
    this.logger.warn(error.message);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.CONFLICT)
      .json({
        error: error.code,
        message: 'Try again.',
      });
  }
}
