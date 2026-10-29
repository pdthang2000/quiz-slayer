import { Pressable, StyleSheet, Text } from 'react-native';
import type { TagColorKey } from '../api/types';
import { spacing, useTheme } from '../theme';

type Props = {
  name: string;
  color?: TagColorKey;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  /** Active cards with this tag, shown after the name (Tag list). */
  count?: number;
  large?: boolean;
  testID?: string;
};

/** A tag shown as a colored chip. `#` is display only (UI-01). */
export function TagChip({
  name,
  color,
  selected,
  onPress,
  onLongPress,
  accessibilityLabel,
  count,
  large,
  testID,
}: Props) {
  const { colors, tagColor } = useTheme();
  const background = color ? tagColor(color) : colors.surfaceMuted;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? `#${name}`}
      testID={testID}
      style={[
        styles.chip,
        large && styles.large,
        { backgroundColor: background, borderColor: selected ? colors.primary : 'transparent' },
      ]}
    >
      <Text style={[styles.text, large && styles.largeText, { color: colors.text }]} numberOfLines={1}>
        #{name}
        {count !== undefined ? (
          <Text style={{ color: colors.textMuted }}>{`  ${count}`}</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    maxWidth: 220,
  },
  text: { fontSize: 14 },
  large: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, maxWidth: '100%' },
  largeText: { fontSize: 16 },
});
