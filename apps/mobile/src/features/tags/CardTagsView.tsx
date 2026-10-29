import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { useCardTags } from '../../api/hooks';
import type { TagWithCount } from '../../api/types';
import { spacing, useTheme } from '../../theme';
import { TagCards } from './TagCards';

/**
 * UI-14: "⋯ → Tags". This card's tags with their Active counts, READ-06 order. Only the
 * tags and counts load; a tag's cards load when it is expanded (C-41).
 */
export function CardTagsView({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tags = useCardTags(cardId);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (tags.isPending) return <ActivityIndicator style={styles.spacer} color={colors.textMuted} />;
  if (tags.isError && !tags.data) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>
        {t(errorMessageKey(tags.error))}
      </Text>
    );
  }
  if (tags.data.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textMuted }]}>{t('tags.ofCard.empty')}</Text>
    );
  }
  return (
    <View>
      {tags.data.map((tag) => (
        <Section key={tag.id} tag={tag} open={open.has(tag.id)} onToggle={() => toggle(tag.id)} />
      ))}
    </View>
  );
}

function Section({ tag, open, onToggle }: { tag: TagWithCount; open: boolean; onToggle: () => void }) {
  const { colors, tagColor } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        testID={`expand-${tag.name}`}
        style={styles.header}
      >
        <Text style={[styles.caret, { color: colors.textMuted }]}>{open ? '▾' : '▸'}</Text>
        <View style={[styles.pill, { backgroundColor: tagColor(tag.color) }]}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            #{tag.name}
          </Text>
        </View>
        <Text style={[styles.count, { color: colors.textMuted }]}>({tag.cardCount})</Text>
      </Pressable>
      {open ? <TagCards tag={tag} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { marginVertical: spacing.xl },
  empty: { textAlign: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  caret: { fontSize: 16, width: 16 },
  pill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexShrink: 1,
  },
  name: { fontSize: 16 },
  count: { fontSize: 15 },
});
