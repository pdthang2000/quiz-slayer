import { ApiError } from './client';

/**
 * card-library.md → Error handling: "Stale screen" errors. The app shows the message and
 * reloads the screen (CONFLICT-01).
 */
const STALE = new Set([
  'CardChanged',
  'TagChanged',
  'TrashChanged',
  'CardIsTrashed',
  'CardIsNotTrashed',
  'TagNoLongerExists',
]);

/** Codes that have their own message in en.json (`errors.<key>`). */
const KNOWN = new Set([
  'InvalidCardFront.empty',
  'InvalidCardFront.tooLong',
  'InvalidCardBack.empty',
  'InvalidCardBack.tooLong',
  'InvalidTagName',
  'TooManyTags',
  'CardIsTrashed',
  'CardIsNotTrashed',
  'TagNoLongerExists',
  'TrashChanged',
  'CardChanged',
  'TagChanged',
  'TagNameTaken',
  'TagMergeFailed',
  'TagNotOnCard',
  'TransactionConflict',
  'CardNotFound',
  'TagNotFound',
  'Network',
]);

/**
 * UI-11: the i18n key for an error. The server's `message` is for logs only.
 * Bugs (InvalidTagColor, TagMergeNotAllowed, request-shape 400s) get the generic message.
 */
export function errorMessageKey(error: unknown): string {
  if (!(error instanceof ApiError)) return 'errors.generic';
  const reason = error.body.reason;
  const withReason =
    typeof reason === 'string' ? `${error.code}.${reason}` : error.code;
  if (KNOWN.has(withReason)) return `errors.${withReason}`;
  if (KNOWN.has(error.code)) return `errors.${error.code}`;
  return 'errors.generic';
}

/** CONFLICT-01: the screen is out of date and must reload after showing the message. */
export function isStale(error: unknown): boolean {
  return error instanceof ApiError && STALE.has(error.code);
}

/** User input errors are shown next to the field they belong to. */
export function fieldOf(error: unknown): 'front' | 'back' | 'tags' | null {
  if (!(error instanceof ApiError)) return null;
  switch (error.code) {
    case 'InvalidCardFront':
      return 'front';
    case 'InvalidCardBack':
      return 'back';
    case 'InvalidTagName':
    case 'TooManyTags':
      return 'tags';
    default:
      return null;
  }
}
