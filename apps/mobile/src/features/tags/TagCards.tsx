import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { useCardList } from '../../api/hooks';
import type { Card, Tag } from '../../api/types';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { TagCardRow } from './TagCardRow';
import { useSelection } from './useSelection';
import { useTagMembership } from './useTagMembership';

/**
 * A tag's card list (UI-05, UI-14): Active cards with the tag, newest first (READ-02),
 * 20 at a time with "Load more". CARDTAG-07: ✕ per row, checkboxes + "Remove (n)".
 * CARDTAG-08: "+ Add cards" opens the picker.
 */
export function TagCards({ tag }: { tag: Tag }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const selection = useSelection();
  const { remove } = useTagMembership({ onDone: selection.clear });

  const filter = useMemo(() => ({ tagIds: [tag.id] }), [tag.id]);
  const list = useCardList(filter);
  const cards = list.data?.pages.flatMap((p) => p.items) ?? [];

  const toggle = (card: Card) => {
    if (!selection.toggle(card)) toast({ message: t('tags.cards.maxSelected') });
  };

  return (
    <View>
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => router.push({ pathname: '/tag/[id]/add', params: { id: tag.id } })}
          accessibilityRole="button"
          testID={`add-cards-${tag.id}`}
        >
          <Text style={[styles.action, { color: colors.primary }]}>
            {t('tags.cards.addCards')}
          </Text>
        </Pressable>
        {selection.count > 0 ? (
          <Pressable
            onPress={() => remove.mutate({ tag, cards: selection.cards() })}
            disabled={remove.isPending}
            accessibilityRole="button"
            testID={`remove-selected-${tag.id}`}
          >
            <Text style={[styles.action, { color: colors.danger }]}>
              {t('tags.cards.remove', { count: selection.count })}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {list.isPending ? (
        <ActivityIndicator style={styles.spacer} color={colors.textMuted} />
      ) : list.isError && cards.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t(errorMessageKey(list.error))}
        </Text>
      ) : cards.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{t('tags.cards.empty')}</Text>
      ) : (
        cards.map((card) => (
          <TagCardRow
            key={card.id}
            card={card}
            tagName={tag.name}
            checked={selection.has(card.id)}
            onToggle={toggle}
            onRemove={(c) => remove.mutate({ tag, cards: [{ id: c.id, version: c.version }] })}
          />
        ))
      )}

      {list.hasNextPage ? (
        <Pressable
          onPress={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
          accessibilityRole="button"
          style={styles.more}
        >
          {list.isFetchingNextPage ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={[styles.action, { color: colors.primary }]}>{t('common.loadMore')}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  action: { fontSize: 16, fontWeight: '600' },
  spacer: { marginVertical: spacing.lg },
  empty: { textAlign: 'center', marginVertical: spacing.lg, paddingHorizontal: spacing.xl },
  more: { alignItems: 'center', paddingVertical: spacing.lg },
});
