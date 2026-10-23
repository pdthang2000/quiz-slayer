import { createParamDecorator } from '@nestjs/common';

/**
 * Q-09: one demo user in v1. Every use case still takes a userId, so real login only
 * has to replace this decorator.
 */
export const DEMO_USER_ID =
  process.env.DEMO_USER_ID ?? '00000000-0000-4000-8000-000000000001';

export const CurrentUser = createParamDecorator((): string => DEMO_USER_ID);
