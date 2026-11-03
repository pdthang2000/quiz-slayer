import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CardFilter } from '../../api/types';
import { useTheme } from '../../theme';
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
    >
      <Text style={[styles.text, { color: disabled ? colors.textMuted : colors.primary }]}>
        {tagName ? t('study.buttonTag', { name: tagName }) : t('study.button')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 16, fontWeight: '600' } });
