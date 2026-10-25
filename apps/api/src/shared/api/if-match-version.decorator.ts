import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

/** `If-Match: "3"` (an ETag) or `If-Match: 3`. */
const VERSION = /^"?(\d{1,9})"?$/;

/**
 * CONFLICT-01: the version of the card or tag the screen showed, from the If-Match header.
 * A header, not the body, so it also works on DELETE (proxies may drop DELETE bodies).
 * Missing → 428 Precondition Required; malformed → 400. Request shape only: comparing it
 * with the stored version is the domain's job (CARD-08, TAG-16).
 */
export const IfMatchVersion = createParamDecorator(
  (_: unknown, context: ExecutionContext): number => {
    const header = context.switchToHttp().getRequest<Request>().headers[
      'if-match'
    ];
    if (header === undefined) {
      throw new HttpException(
        'If-Match with the version the screen showed is required',
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }
    const match = VERSION.exec(String(header).trim());
    if (!match) {
      throw new BadRequestException('If-Match must be a version, e.g. "3"');
    }
    return Number(match[1]);
  },
);
