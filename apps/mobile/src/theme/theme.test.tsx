import { renderHook } from '@testing-library/react-native';
import * as RN from 'react-native';
import type { TagColorKey } from '../api/types';
import { useTheme } from '.';

const KEYS: TagColorKey[] = [
  'red', 'orange', 'amber', 'green', 'teal', 'cyan',
  'blue', 'indigo', 'purple', 'pink', 'brown', 'slate',
];

function themeFor(scheme: 'light' | 'dark') {
  jest.spyOn(RN, 'useColorScheme').mockReturnValue(scheme);
  return renderHook(() => useTheme());
}

afterEach(() => jest.restoreAllMocks());

describe('theme', () => {
  it('UI-12: dark mode follows the phone setting', async () => {
    const light = (await themeFor('light')).result.current;
    const dark = (await themeFor('dark')).result.current;
    expect(light.scheme).toBe('light');
    expect(dark.scheme).toBe('dark');
    expect(dark.colors.background).not.toBe(light.colors.background);
  });

  it('UI-07: every palette key (TAG-13) has its own light and dark color', async () => {
    const light = (await themeFor('light')).result.current;
    const dark = (await themeFor('dark')).result.current;
    const lightColors = KEYS.map((k) => light.tagColor(k));
    const darkColors = KEYS.map((k) => dark.tagColor(k));
    expect(new Set(lightColors).size).toBe(12);
    expect(new Set(darkColors).size).toBe(12);
    KEYS.forEach((_, i) => expect(lightColors[i]).not.toBe(darkColors[i]));
  });
});
