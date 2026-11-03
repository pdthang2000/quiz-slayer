import { InvalidQuestionTagName } from './errors';

// QB-07: the same name rules as Card tags (TAG-01, TAG-02), kept here because a domain
// never imports another context. Letters, marks, decimal digits, space, '-', '_'.
const ALLOWED = /^[\p{L}\p{M}\p{Nd} _-]+$/u;

/**
 * QB-09: no tag repeats what the kind field says: no #listening or #audio, and no kind name
 * (provisional list, G-12).
 */
const REPEATS_KIND = new Set([
  'listening',
  'audio',
  'single',
  'single audio',
  'reading group',
  'audio group',
]);

/** QB-07: a normalized, case-sensitive question tag name. */
export class QuestionTagName {
  static readonly MAX_LENGTH = 50;

  private constructor(readonly value: string) {}

  static create(input: string): QuestionTagName {
    const value = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
    const length = [...value].length;
    if (length < 1 || length > QuestionTagName.MAX_LENGTH) {
      throw new InvalidQuestionTagName(input, 'length');
    }
    if (!ALLOWED.test(value))
      throw new InvalidQuestionTagName(input, 'character');
    if (REPEATS_KIND.has(value.toLowerCase())) {
      throw new InvalidQuestionTagName(input, 'repeatsKind');
    }
    return new QuestionTagName(value);
  }

  toString(): string {
    return this.value;
  }
}
