import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CardFilter } from '../../api/types';
import { spacing, useTheme } from '../../theme';
import { openStudy } from './openStudy';

type Props = {
  filter: CardFilter;
  /** On a tag's card list the button reads "Study #HSK1" (STUDY-07). */
  tagName?: string;
  /** STUDY-07: disabled while the list shows 0 cards. */
  disabled: boolean;
};

export function StudyButton({ filter, tagName, disabled }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => openStudy(filter)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      testID="study-button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? colors.surfaceMuted : colors.primary,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text style={[styles.text, { color: disabled ? colors.textMuted : colors.onPrimary }]}>
        {tagName ? t('study.buttonTag', { name: tagName }) : t('study.button')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 10 },
  text: { fontSize: 16, fontWeight: '600' },
});
