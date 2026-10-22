import { InvalidTagColor } from './errors';
import { TAG_COLOR_KEYS, TagColor } from './tag-color';

describe('TagColor', () => {
  it('TAG-13: a color is one of the 12 palette keys', () => {
    expect(TAG_COLOR_KEYS).toHaveLength(12);
    expect(TagColor.from('blue').value).toBe('blue');
    expect(() => TagColor.from('#1D4ED8')).toThrow(InvalidTagColor);
    expect(() => TagColor.from('Blue')).toThrow(InvalidTagColor);
  });

  it('TAG-12: a random color is always a palette key', () => {
    expect(TagColor.random(() => 0).value).toBe('red');
    expect(TagColor.random(() => 0.9999).value).toBe('slate');
    expect(TagColor.random(() => 1).value).toBe('slate');
    expect(TagColor.random(() => -0.1).value).toBe('red');
    for (let i = 0; i < 100; i++) {
      expect(TAG_COLOR_KEYS).toContain(TagColor.random().value);
    }
  });
});
