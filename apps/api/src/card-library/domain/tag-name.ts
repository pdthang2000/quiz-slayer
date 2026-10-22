import { InvalidTagName } from './errors';

// TAG-01 step 5: letters, combining marks, decimal digits (Nd, C-12), space, '-', '_'.
const ALLOWED = /^[\p{L}\p{M}\p{Nd} _-]+$/u;

/** TAG-01, TAG-02: normalized, case-sensitive tag name. */
export class TagName {
  static readonly MAX_LENGTH = 50;

  private constructor(readonly value: string) {}

  static create(input: string): TagName {
    const value = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
    const length = [...value].length;
    if (length < 1 || length > TagName.MAX_LENGTH) {
      throw new InvalidTagName(input, 'length');
    }
    if (!ALLOWED.test(value)) {
      throw new InvalidTagName(input, 'character');
    }
    return new TagName(value);
  }

  equals(other: TagName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
