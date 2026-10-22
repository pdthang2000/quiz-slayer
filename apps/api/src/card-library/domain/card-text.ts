import { InvalidCardBack, InvalidCardFront } from './errors';

/** CARD-05: NFC, then trim the ends. Inner spaces and newlines are kept. */
function normalize(input: string): string {
  return input.normalize('NFC').trim();
}

/** CARD-02: length in code points, so Chinese is not penalised. */
function length(text: string): number {
  return [...text].length;
}

/** CARD-01, CARD-02, CARD-05 */
export class CardFront {
  static readonly MAX_LENGTH = 500;

  private constructor(readonly value: string) {}

  static create(input: string): CardFront {
    const value = normalize(input);
    if (value.length === 0) throw new InvalidCardFront('empty');
    if (length(value) > CardFront.MAX_LENGTH) {
      throw new InvalidCardFront('tooLong');
    }
    return new CardFront(value);
  }

  equals(other: CardFront): boolean {
    return this.value === other.value;
  }
}

/** CARD-01, CARD-02, CARD-05 */
export class CardBack {
  static readonly MAX_LENGTH = 3000;

  private constructor(readonly value: string) {}

  static create(input: string): CardBack {
    const value = normalize(input);
    if (value.length === 0) throw new InvalidCardBack('empty');
    if (length(value) > CardBack.MAX_LENGTH) {
      throw new InvalidCardBack('tooLong');
    }
    return new CardBack(value);
  }

  equals(other: CardBack): boolean {
    return this.value === other.value;
  }
}
