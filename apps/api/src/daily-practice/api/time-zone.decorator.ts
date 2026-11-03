import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** DP-05, ADR-013: the phone's IANA timezone, sent in X-Time-Zone. Checked by the domain. */
export const TimeZone = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const value = ctx
      .switchToHttp()
      .getRequest<Request>()
      .header('x-time-zone');
    return value || undefined;
  },
);
