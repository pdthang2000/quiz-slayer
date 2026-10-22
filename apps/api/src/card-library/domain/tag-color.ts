import { InvalidTagColor } from './errors';

/** TAG-13: the palette keys. The app maps each key to a light and a dark color (UI-07). */
export const TAG_COLOR_KEYS = [
  'red',
  'orange',
  'amber',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown',
  'slate',
] as const;

export type TagColorKey = (typeof TAG_COLOR_KEYS)[number];

/** TAG-12, TAG-13 */
export class TagColor {
  private constructor(readonly value: TagColorKey) {}

  static from(input: string): TagColor {
    const key = TAG_COLOR_KEYS.find((k) => k === input);
    if (!key) throw new InvalidTagColor(input);
    return new TagColor(key);
  }

  /** TAG-12: a new tag gets a random color. `random` returns [0, 1), like Math.random. */
  static random(random: () => number = Math.random): TagColor {
    const index = Math.floor(random() * TAG_COLOR_KEYS.length);
    return new TagColor(TAG_COLOR_KEYS[index]);
  }

  equals(other: TagColor): boolean {
    return this.value === other.value;
  }
}
