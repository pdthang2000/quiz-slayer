import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TagMergeNeedsConfirmation, TrashChanged } from '../application/errors';
import { DomainError, TagMergeNotAllowed, TooManyTags } from '../domain/errors';

type Mapping = {
  status: HttpStatus;
  /** Bug kind: the app should never cause it, so log it. */
  bug?: boolean;
  /** Code sent to the client, when it must differ (don't reveal other users' tags). */
  publicCode?: string;
  details?: (error: DomainError) => Record<string, unknown>;
};

const withReason = (e: DomainError) => ({
  reason: (e as unknown as { reason: string }).reason,
});

/** card-library.md → Error handling (C-18 and later). */
const MAPPINGS: Record<string, Mapping> = {
  InvalidCardFront: { status: HttpStatus.BAD_REQUEST, details: withReason },
  InvalidCardBack: { status: HttpStatus.BAD_REQUEST, details: withReason },
  InvalidTagName: { status: HttpStatus.BAD_REQUEST, details: withReason },
  InvalidTagColor: { status: HttpStatus.BAD_REQUEST, bug: true },
  TooManyTags: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    details: (e) => ({ cardId: (e as TooManyTags).cardId ?? null }), // CARDTAG-08
  },
  CardIsTrashed: { status: HttpStatus.CONFLICT },
  CardIsNotTrashed: { status: HttpStatus.CONFLICT },
  TagNoLongerExists: { status: HttpStatus.CONFLICT },
  TagMergeNeedsConfirmation: {
    status: HttpStatus.CONFLICT,
    details: (e) => {
      const { into, ...counts } = (e as TagMergeNeedsConfirmation).preview;
      return { into: into?.name ?? null, intoId: into?.id ?? null, ...counts };
    },
  },
  TrashChanged: {
    status: HttpStatus.CONFLICT,
    details: (e) => ({
      expectedCount: (e as TrashChanged).expectedCount,
      actualCount: (e as TrashChanged).actualCount,
      actualNewestTrashedAt: (e as TrashChanged).actualNewestTrashedAt,
    }),
  },
  CardChanged: { status: HttpStatus.CONFLICT },
  TagChanged: { status: HttpStatus.CONFLICT },
  TagNameTaken: { status: HttpStatus.CONFLICT },
  TagNotOnCard: { status: HttpStatus.CONFLICT },
  TagMergeFailed: { status: HttpStatus.CONFLICT },
  CardNotFound: { status: HttpStatus.NOT_FOUND },
  TagNotFound: { status: HttpStatus.NOT_FOUND },
};

/** Maps every domain error to HTTP. The app turns `error` into a message. */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapping = this.mappingFor(error);
    if (mapping.bug || mapping.status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${error.code}: ${error.message}`, error.stack);
    }
    response.status(mapping.status).json({
      error: mapping.publicCode ?? error.code,
      message: mapping.bug ? 'Something went wrong' : error.message,
      ...mapping.details?.(error),
    });
  }

  private mappingFor(error: DomainError): Mapping {
    if (error instanceof TagMergeNotAllowed) {
      return error.reason === 'otherUser'
        ? { status: HttpStatus.NOT_FOUND, publicCode: 'TagNotFound', bug: true }
        : { status: HttpStatus.CONFLICT, bug: true };
    }
    return (
      MAPPINGS[error.code] ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        bug: true,
      }
    );
  }
}
