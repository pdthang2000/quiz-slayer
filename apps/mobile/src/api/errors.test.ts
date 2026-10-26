import i18n from '../i18n';
import { ApiError } from './client';
import { errorMessageKey, fieldOf, isStale } from './errors';

const error = (code: string, body: Record<string, unknown> = {}) =>
  new ApiError(409, code, { error: code, ...body });

/** Every code in card-library.md → Error handling, with its reasons. */
const ERROR_TABLE = [
  ['InvalidCardFront', 'empty'],
  ['InvalidCardFront', 'tooLong'],
  ['InvalidCardBack', 'empty'],
  ['InvalidCardBack', 'tooLong'],
  ['InvalidTagName', 'length'],
  ['InvalidTagName', 'character'],
  ['InvalidTagColor'],
  ['TooManyTags'],
  ['CardIsTrashed'],
  ['CardIsNotTrashed'],
  ['TagNoLongerExists'],
  ['TrashChanged'],
  ['CardChanged'],
  ['TagChanged'],
  ['TagNameTaken'],
  ['TagMergeFailed'],
  ['TransactionConflict'],
  ['TagNotOnCard'],
  ['TagMergeNotAllowed', 'sameTag'],
  ['CardNotFound'],
  ['TagNotFound'],
] as const;

describe('error messages', () => {
  it('UI-11: every code in the error table maps to an i18n message', () => {
    for (const [code, reason] of ERROR_TABLE) {
      const key = errorMessageKey(error(code, reason ? { reason } : {}));
      expect(i18n.exists(key)).toBe(true);
      expect(i18n.t(key)).not.toBe(key);
    }
  });

  it('UI-11: messages come from the app, not from the server', () => {
    const e = error('CardChanged', { message: 'Card c1 was changed meanwhile' });
    expect(i18n.t(errorMessageKey(e))).toBe(
      'This card was changed on another device. Refresh.',
    );
  });

  it('UI-11: user input errors pick the message for their reason', () => {
    expect(i18n.t(errorMessageKey(error('InvalidCardBack', { reason: 'tooLong' })))).toBe(
      'Back is max 3000 characters',
    );
  });

  it('UI-11: bugs and unknown codes get the generic message', () => {
    expect(errorMessageKey(error('InvalidTagColor'))).toBe('errors.generic');
    expect(errorMessageKey(error('Http400'))).toBe('errors.generic');
    expect(errorMessageKey(new Error('boom'))).toBe('errors.generic');
  });

  it('UI-16: app messages that are not in the error table', () => {
    expect(i18n.t(errorMessageKey(new ApiError(0, 'Network', {})))).toBe(
      "Can't reach the server. Check your connection.",
    );
    expect(i18n.t(errorMessageKey(error('CardNotFound')))).toBe(
      'This card no longer exists.',
    );
    expect(i18n.t('cards.empty')).toBe('No cards yet. Tap + to add one.');
    expect(i18n.t('cards.emptyFiltered')).toBe('No cards match.');
    expect(i18n.t('cards.restored')).toBe('Card restored');
  });

  it('UI-15: the discard prompt says "Discard changes?"', () => {
    expect(i18n.t('editor.discardTitle')).toBe('Discard changes?');
  });

  it('CONFLICT-01: stale-screen errors reload the screen; others do not', () => {
    for (const code of ['CardChanged', 'TagChanged', 'TrashChanged', 'CardIsTrashed']) {
      expect(isStale(error(code))).toBe(true);
    }
    for (const code of ['TooManyTags', 'TagMergeFailed', 'Network']) {
      expect(isStale(error(code))).toBe(false);
    }
  });

  it('user input errors belong to a field', () => {
    expect(fieldOf(error('InvalidCardFront', { reason: 'empty' }))).toBe('front');
    expect(fieldOf(error('TooManyTags'))).toBe('tags');
    expect(fieldOf(error('CardChanged'))).toBeNull();
  });
});
