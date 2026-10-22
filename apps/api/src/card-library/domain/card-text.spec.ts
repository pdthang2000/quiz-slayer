import { CardBack, CardFront } from './card-text';
import { InvalidCardBack, InvalidCardFront } from './errors';

describe('CardFront / CardBack', () => {
  it('CARD-01: front and back are required; empty after trimming is invalid', () => {
    expect(() => CardFront.create('')).toThrow(InvalidCardFront);
    expect(() => CardFront.create(' \n\t ')).toThrow(InvalidCardFront);
    expect(() => CardBack.create('')).toThrow(InvalidCardBack);
    expect(() => CardBack.create('  ')).toThrow(InvalidCardBack);
  });

  it('CARD-02: front max 500, back max 3000 characters', () => {
    expect(CardFront.create('a'.repeat(500)).value).toHaveLength(500);
    expect(() => CardFront.create('a'.repeat(501))).toThrow(InvalidCardFront);
    expect(CardBack.create('a'.repeat(3000)).value).toHaveLength(3000);
    expect(() => CardBack.create('a'.repeat(3001))).toThrow(InvalidCardBack);
  });

  it('CARD-02: length is counted in code points after NFC, not bytes or UTF-16 units', () => {
    // 500 Chinese characters fit, 500 emoji (2 UTF-16 units each) fit.
    expect(() => CardFront.create('你'.repeat(500))).not.toThrow();
    expect(() => CardFront.create('😀'.repeat(500))).not.toThrow();
    // Decomposed "ộ" is 3 code points but 1 after NFC.
    expect(() => CardFront.create('ộ'.repeat(500))).not.toThrow();
  });

  it('CARD-05: stored as NFC with the ends trimmed; inner whitespace kept', () => {
    expect(CardFront.create('  Dog \n').value).toBe('Dog');
    expect(CardBack.create('a mammal\nthat  barks').value).toBe(
      'a mammal\nthat  barks',
    );
    expect(CardFront.create('ộ').value).toBe('ộ');
  });

  it('CARD-03: front and back are plain text; markup is kept as typed, not interpreted', () => {
    expect(CardFront.create('<b>Dog</b>').value).toBe('<b>Dog</b>');
    expect(CardBack.create('**a mammal**').value).toBe('**a mammal**');
  });

  it('CARD-05: length is counted after trimming', () => {
    expect(() => CardFront.create(`  ${'a'.repeat(500)}  `)).not.toThrow();
  });
});
