import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card } from '../../api/types';
import { spacing, useTheme } from '../../theme';

type Props = {
  card: Card;
  onMenu: (card: Card) => void;
};

/** UI-10: shows the front; tap flips it in place to the back; "⋯" opens the card menu. */
export function CardRow({ card, onMenu }: Props) {
  const [flipped, setFlipped] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Pressable
        style={styles.body}
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        accessibilityHint={flipped ? t('editor.front') : t('editor.back')}
        testID={`card-${card.id}`}
      >
        <Text style={[styles.text, { color: colors.text }]}>
          {flipped ? card.back : card.front}
        </Text>
      </Pressable>
      <Pressable
        hitSlop={12}
        onPress={() => onMenu(card)}
        accessibilityRole="button"
        accessibilityLabel={t('cards.menu.title')}
        testID={`card-menu-${card.id}`}
        style={styles.menu}
      >
        <Text style={[styles.dots, { color: colors.textMuted }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  body: { flex: 1, padding: spacing.lg, minHeight: 56, justifyContent: 'center' },
  text: { fontSize: 17 },
  menu: { paddingHorizontal: spacing.lg, alignSelf: 'stretch', justifyContent: 'center' },
  dots: { fontSize: 22 },
});
