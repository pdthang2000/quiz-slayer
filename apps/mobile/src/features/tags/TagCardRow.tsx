import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card } from '../../api/types';
import { Checkbox } from '../../components/Checkbox';
import { spacing, useTheme } from '../../theme';

type Props = {
  card: Card;
  checked: boolean;
  onToggle: (card: Card) => void;
  /** CARDTAG-07: ✕ removes this one card from the tag. Absent in the picker. */
  onRemove?: (card: Card) => void;
  /** CARDTAG-08: a card with 20 tags is greyed out and can't be ticked. */
  disabled?: boolean;
  note?: string;
  tagName: string;
};

/** A row of a tag's card list or of the "+ Add cards" picker. Tap flips it (UI-10). */
export function TagCardRow({ card, checked, onToggle, onRemove, disabled, note, tagName }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [flipped, setFlipped] = useState(false);
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onPress={() => onToggle(card)}
        accessibilityLabel={t('tags.cards.select', { front: card.front })}
        testID={`check-${card.id}`}
      />
      <Pressable
        style={styles.body}
        onPress={() => setFlipped((f) => !f)}
        accessibilityRole="button"
        testID={`row-${card.id}`}
      >
        <Text style={[styles.text, { color: colors.text }]} numberOfLines={3}>
          {flipped ? card.back : card.front}
        </Text>
        {note ? <Text style={[styles.note, { color: colors.textMuted }]}>{note}</Text> : null}
      </Pressable>
      {onRemove ? (
        <Pressable
          hitSlop={12}
          onPress={() => onRemove(card)}
          accessibilityRole="button"
          accessibilityLabel={t('tags.cards.removeOne', { name: tagName })}
          testID={`remove-${card.id}`}
          style={styles.remove}
        >
          <Text style={[styles.x, { color: colors.textMuted }]}>✕</Text>
        </Pressable>
      ) : null}
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
    paddingLeft: spacing.lg,
  },
  body: { flex: 1, padding: spacing.lg, minHeight: 56, justifyContent: 'center' },
  text: { fontSize: 17 },
  note: { fontSize: 12, marginTop: spacing.xs },
  remove: { paddingHorizontal: spacing.lg, alignSelf: 'stretch', justifyContent: 'center' },
  x: { fontSize: 18 },
});
