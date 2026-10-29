import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardsApi } from '../../api/cards';
import { errorMessageKey, isStale } from '../../api/errors';
import {
  keys,
  useCardList,
  useDebounced,
  useRefetchOnFocus,
  useTags,
} from '../../api/hooks';
import type { Card } from '../../api/types';
import { TagChip } from '../../components/TagChip';
import { useToast } from '../../components/Toast';
import { CardMenu } from '../../features/cards/CardMenu';
import { CardRow } from '../../features/cards/CardRow';
import { spacing, useTheme } from '../../theme';

/**
 * The card list: search (READ-03), tag chips (READ-05: cards with all selected tags),
 * newest first with load more (READ-02). UI-10 rows, UI-13 delete + Undo.
 */
export default function CardsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [menuCard, setMenuCard] = useState<Card | null>(null);
  const debouncedSearch = useDebounced(search.trim());

  const tags = useTags();
  const tagList = useMemo(() => tags.data ?? [], [tags.data]);
  // Tags that disappeared (deleted or merged elsewhere) drop out of the filter.
  const activeTagIds = useMemo(
    () => selectedTagIds.filter((id) => tagList.some((x) => x.id === id)),
    [selectedTagIds, tagList],
  );
  const filter = useMemo(
    () => ({ search: debouncedSearch, tagIds: activeTagIds }),
    [debouncedSearch, activeTagIds],
  );

  const list = useCardList(filter);
  const refetchAll = () => Promise.all([list.refetch(), tags.refetch()]);
  useRefetchOnFocus(refetchAll);

  const cards = list.data?.pages.flatMap((p) => p.items) ?? [];

  const showError = (error: unknown) => {
    toast({ message: t(errorMessageKey(error)) });
    if (isStale(error)) void refetchAll(); // CONFLICT-01: reload this screen
  };

  const restore = useMutation({
    mutationFn: cardsApi.restore,
    onSuccess: () => toast({ message: t('cards.restored') }),
    onError: showError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.cards }),
  });

  // UI-13: no dialog; the card goes to the Trash at once and Undo restores it.
  const moveToTrash = useMutation({
    mutationFn: cardsApi.moveToTrash,
    onSuccess: (trashed) =>
      toast({
        message: t('cards.movedToTrash'),
        action: { label: t('common.undo'), onPress: () => restore.mutate(trashed) },
      }),
    onError: showError,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.cards }),
        queryClient.invalidateQueries({ queryKey: keys.tags }), // Active counts changed
      ]),
  });

  const toggleTag = (id: string) =>
    setSelectedTagIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const filtered = debouncedSearch !== '' || activeTagIds.length > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('cards.searchPlaceholder')}
        placeholderTextColor={colors.textMuted}
        clearButtonMode="while-editing"
        autoCorrect={false}
        returnKeyType="search"
        style={[
          styles.search,
          { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
        ]}
      />
      {tagList.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipRow}
        >
          {tagList.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              selected={activeTagIds.includes(tag.id)}
              onPress={() => toggleTag(tag.id)}
            />
          ))}
        </ScrollView>
      )}

      {list.isPending ? (
        <ActivityIndicator style={styles.center} color={colors.textMuted} />
      ) : list.isError && cards.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(list.error))}</Text>
          <Pressable onPress={() => void list.refetch()} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CardRow card={item} onMenu={setMenuCard} />}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => void refetchAll()}
              tintColor={colors.textMuted}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              {filtered ? t('cards.emptyFiltered') : t('cards.empty')}
            </Text>
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.textMuted} />
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cards.new')}
        onPress={() => router.push('/card/edit')}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + spacing.xl }]}
      >
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>+</Text>
      </Pressable>

      <CardMenu
        visible={menuCard !== null}
        onClose={() => setMenuCard(null)}
        onEdit={() =>
          menuCard && router.push({ pathname: '/card/edit', params: { id: menuCard.id } })
        }
        onTags={() =>
          menuCard && router.push({ pathname: '/card/tags', params: { id: menuCard.id } })
        }
        onDelete={() =>
          menuCard && moveToTrash.mutate({ id: menuCard.id, version: menuCard.version })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  chipRow: { flexGrow: 0 },
  chips: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  link: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
  footer: { marginVertical: spacing.lg },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { fontSize: 30, lineHeight: 32 },
});
