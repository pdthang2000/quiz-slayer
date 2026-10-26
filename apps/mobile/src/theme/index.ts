import { useColorScheme } from 'react-native';
import type { TagColorKey } from '../api/types';

// UI-12: dark mode follows the phone. Screens take colors from here, never literals.

const light = {
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEFF2',
  text: '#16181D',
  textMuted: '#5D6370',
  border: '#DADDE3',
  primary: '#3B5BDB',
  onPrimary: '#FFFFFF',
  danger: '#C92A2A',
  toast: '#1F2229',
  onToast: '#FFFFFF',
};

const dark: typeof light = {
  background: '#0F1115',
  surface: '#181B21',
  surfaceMuted: '#22262E',
  text: '#ECEEF2',
  textMuted: '#A0A6B2',
  border: '#2E333D',
  primary: '#7C95F5',
  onPrimary: '#0F1115',
  danger: '#FF8787',
  toast: '#ECEEF2',
  onToast: '#16181D',
};

export type Colors = typeof light;

/**
 * UI-07, TAG-13: the app owns a light and a dark color per palette key.
 * Chosen for readable text on the chip (dark text on light chips, light text on dark).
 */
const tagPalette: Record<TagColorKey, { light: string; dark: string }> = {
  red: { light: '#FFE3E3', dark: '#7A2121' },
  orange: { light: '#FFE8CC', dark: '#7A3E0E' },
  amber: { light: '#FFF3BF', dark: '#6B5410' },
  green: { light: '#D3F9D8', dark: '#1F5C2C' },
  teal: { light: '#C3FAE8', dark: '#0F5A4C' },
  cyan: { light: '#C5F6FA', dark: '#0C5563' },
  blue: { light: '#D0EBFF', dark: '#16457A' },
  indigo: { light: '#DBE4FF', dark: '#2B3A82' },
  purple: { light: '#EEDCFF', dark: '#552C80' },
  pink: { light: '#FFDEEB', dark: '#7A2350' },
  brown: { light: '#EFE2D6', dark: '#5C4130' },
  slate: { light: '#E3E7ED', dark: '#3A4250' },
};

export function useTheme() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = scheme === 'dark' ? dark : light;
  return {
    scheme,
    colors,
    tagColor: (key: TagColorKey) => tagPalette[key]?.[scheme] ?? colors.surfaceMuted,
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
