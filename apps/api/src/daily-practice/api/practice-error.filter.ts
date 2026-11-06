import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../domain/errors';

type Mapping = { status: HttpStatus; bug?: boolean };

/** daily-practice.md → Error handling (draft, G-14). */
const MAPPINGS: Record<string, Mapping> = {
  InvalidTimeZone: { status: HttpStatus.BAD_REQUEST, bug: true },
  InvalidDailySize: { status: HttpStatus.BAD_REQUEST },
  InvalidTrackKinds: { status: HttpStatus.BAD_REQUEST },
  InvalidAnswer: { status: HttpStatus.BAD_REQUEST, bug: true },
  NoQuizzesMatch: { status: HttpStatus.UNPROCESSABLE_ENTITY },
  TrackIsRemoved: { status: HttpStatus.CONFLICT },
  QuizAlreadyAnswered: { status: HttpStatus.CONFLICT },
  QuizOutOfOrder: { status: HttpStatus.CONFLICT },
  CannotSaveAsCard: { status: HttpStatus.CONFLICT },
  DailySessionClosed: { status: HttpStatus.CONFLICT },
  TrackChanged: { status: HttpStatus.CONFLICT },
  DailySessionExists: { status: HttpStatus.CONFLICT },
  PracticeChanged: { status: HttpStatus.CONFLICT },
  DailySessionNotFound: { status: HttpStatus.NOT_FOUND },
  TrackNotFound: { status: HttpStatus.NOT_FOUND },
  QuestionTagNotFound: { status: HttpStatus.NOT_FOUND },
};

/** Maps Daily Practice errors to HTTP; the app turns `error` into a message. */
@Catch(DomainError)
export class PracticeErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(PracticeErrorFilter.name);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapping = MAPPINGS[error.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      bug: true,
    };
    if (mapping.bug)
      this.logger.error(`${error.code}: ${error.message}`, error.stack);
    const reason = (error as unknown as { reason?: string }).reason;
    response.status(mapping.status).json({
      error: error.code,
      message: mapping.bug ? 'Something went wrong' : error.message,
      ...(reason ? { reason } : {}),
    });
  }
}
