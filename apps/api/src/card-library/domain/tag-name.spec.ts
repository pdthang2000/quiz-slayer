import { InvalidTagName } from './errors';
import { TagName } from './tag-name';

describe('TagName', () => {
  it('TAG-01: trims and collapses inner whitespace', () => {
    expect(TagName.create(' pit   bull ').value).toBe('pit bull');
    expect(TagName.create('pit\t\n bull').value).toBe('pit bull');
  });

  it('TAG-01: normalizes to NFC', () => {
    const decomposed = 'động vật';
    expect(TagName.create(decomposed).value).toBe('động vật');
    expect(TagName.create(decomposed).equals(TagName.create('động vật'))).toBe(
      true,
    );
  });

  it('TAG-01: accepts letters in any language, digits, space, - and _', () => {
    for (const name of [
      '动物',
      'động vật',
      'HSK1',
      'pit-bull',
      'snake_case',
      '٣',
    ]) {
      expect(TagName.create(name).value).toBe(name);
    }
  });

  it('TAG-01: rejects other characters', () => {
    for (const name of ['HSK.1', 'a,b', '#tag', 'a/b', 'emoji😀']) {
      expect(() => TagName.create(name)).toThrow(InvalidTagName);
    }
  });

  it('TAG-01: accepts only decimal digits, not other number characters', () => {
    for (const name of ['①', 'Ⅻ', '½', 'x²']) {
      expect(() => TagName.create(name)).toThrow(InvalidTagName);
    }
  });

  it('TAG-01: length is 1 to 50 characters after normalization', () => {
    expect(() => TagName.create('   ')).toThrow(InvalidTagName);
    expect(TagName.create('a'.repeat(50)).value).toHaveLength(50);
    expect(() => TagName.create('a'.repeat(51))).toThrow(InvalidTagName);
    expect(TagName.create(` ${'a'.repeat(50)} `).value).toHaveLength(50);
    expect([...TagName.create('动'.repeat(50)).value]).toHaveLength(50);
  });

  it('TAG-02: names are case-sensitive', () => {
    expect(TagName.create('Animals').equals(TagName.create('animals'))).toBe(
      false,
    );
  });
});
