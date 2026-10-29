import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardsApi } from '../../api/cards';
import { errorMessageKey } from '../../api/errors';
import { keys, useTrash } from '../../api/hooks';
import { trashApi } from '../../api/trash';
import type { Card, CardVersion, EmptyTrashInput } from '../../api/types';
import { ActionSheet } from '../../components/ActionSheet';
import { confirm } from '../../components/confirm';
import { useToast } from '../../components/Toast';
import { CardRow } from '../cards/CardRow';
import { spacing, useTheme } from '../../theme';
import { listDeceleration } from '../../theme/scroll';

/**
 * The Trash tab: trashed cards, most recently trashed first, 20 at a time, with the total
 * (TRASH-12). Each card can be restored (TRASH-04) or deleted permanently (TRASH-05).
 * "Empty trash" asks with the count (TRASH-07) and sends what the screen showed (TRASH-11).
 */
export function TrashList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [menuCard, setMenuCard] = useState<Card | null>(null);

  const trash = useTrash();
  const cards = trash.data?.pages.flatMap((p) => p.items) ?? [];
  const first = trash.data?.pages[0];
  const total = first?.total ?? 0;

  // Card list, Trash and tag counts (TRASH-03) all change when a card leaves the Trash.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.cards }),
      queryClient.invalidateQueries({ queryKey: keys.tags }),
    ]);

  // Every attempt reloads afterwards (onSettled), so a stale screen refreshes (CONFLICT-01).
  const showError = (error: unknown) => toast({ message: t(errorMessageKey(error)) });

  const restore = useMutation({
    mutationFn: cardsApi.restore,
    onSuccess: () => toast({ message: t('cards.restored') }),
    onError: showError,
    onSettled: reload,
  });

  const deletePermanently = useMutation({
    mutationFn: trashApi.deletePermanently,
    onSuccess: () => toast({ message: t('trash.deleted') }),
    onError: showError,
    onSettled: reload,
  });

  const empty = useMutation({
    mutationFn: trashApi.empty,
    onSuccess: () => toast({ message: t('trash.emptied') }),
    onError: showError,
    onSettled: reload,
  });

  const askDelete = async (card: CardVersion) => {
    const yes = await confirm(
      t('trash.deleteConfirm'),
      t('trash.delete'),
      t('common.cancel'),
      true,
    );
    if (yes) deletePermanently.mutate(card);
  };

  const askEmpty = async (shown: EmptyTrashInput) => {
    const yes = await confirm(
      t('trash.emptyConfirm', { count: shown.expectedCount }),
      t('trash.delete'),
      t('common.cancel'),
      true,
    );
    if (yes) empty.mutate(shown);
  };

  if (trash.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  }
  if (trash.isError && cards.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(trash.error))}</Text>
        <Pressable onPress={() => void trash.refetch()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <FlatList
        testID="trash-list"
        decelerationRate={listDeceleration}
        data={cards}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CardRow card={item} onMenu={setMenuCard} />}
        onEndReached={() => {
          if (trash.hasNextPage && !trash.isFetchingNextPage) void trash.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={trash.isRefetching && !trash.isFetchingNextPage}
            onRefresh={() => void trash.refetch()}
            tintColor={colors.textMuted}
          />
        }
        ListHeaderComponent={
          total > 0 ? (
            <View style={styles.toolbar}>
              <Text style={{ color: colors.textMuted }} testID="trash-total">
                {t('trash.total', { count: total })}
              </Text>
              <Pressable
                onPress={() =>
                  void askEmpty({
                    expectedCount: total,
                    newestTrashedAt: first?.newestTrashedAt ?? null,
                  })
                }
                disabled={empty.isPending}
                accessibilityRole="button"
                testID="empty-trash"
              >
                <Text style={[styles.link, { color: colors.danger }]}>{t('trash.empty')}</Text>
              </Pressable>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('trash.emptyList')}
          </Text>
        }
        ListFooterComponent={
          trash.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.textMuted} />
          ) : undefined
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      />
      <ActionSheet
        visible={menuCard !== null}
        onClose={() => setMenuCard(null)}
        actions={[
          {
            label: t('trash.restore'),
            onPress: () => menuCard && restore.mutate(menuCard),
            testID: 'trash-restore',
          },
          {
            label: t('trash.deletePermanently'),
            onPress: () => menuCard && void askDelete(menuCard),
            danger: true,
            testID: 'trash-delete',
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  link: { fontSize: 16, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  footer: { marginVertical: spacing.lg },
});
