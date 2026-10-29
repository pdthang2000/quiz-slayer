import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../../api/errors';
import { useDebounced, useTagPicker, useTags } from '../../../api/hooks';
import type { Card } from '../../../api/types';
import { useToast } from '../../../components/Toast';
import { TagCardRow } from '../../../features/tags/TagCardRow';
import { useSelection } from '../../../features/tags/useSelection';
import { useTagMembership } from '../../../features/tags/useTagMembership';
import { spacing, useTheme } from '../../../theme';

/**
 * CARDTAG-08: "+ Add cards". Active cards not in the tag, with search (READ-03), newest
 * first, 20 at a time + Load more. Cards with 20 tags are greyed out. At most 100 per add.
 */
export default function AddCardsToTag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const tag = useTags().data?.find((x) => x.id === id);

  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim());
  const picker = useTagPicker(id, debounced);
  const cards = picker.data?.pages.flatMap((p) => p.items) ?? [];

  const selection = useSelection();
  const { add } = useTagMembership({ onAdded: () => router.back() });

  const toggle = (card: Card) => {
    if (!selection.toggle(card)) toast({ message: t('tags.cards.maxSelected') });
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: tag ? t('tags.cards.pickerTitle', { name: tag.name }) : '',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.cancel')}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => tag && add.mutate({ tag, cards: selection.cards() })}
              disabled={!tag || selection.count === 0 || add.isPending}
              accessibilityRole="button"
              testID="add-selected"
            >
              <Text
                style={{
                  color: selection.count === 0 ? colors.textMuted : colors.primary,
                  fontSize: 17,
                  fontWeight: '600',
                }}
              >
                {t('tags.cards.add', { count: selection.count })}
              </Text>
            </Pressable>
          ),
        }}
      />
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
      {picker.isPending ? (
        <ActivityIndicator style={styles.spacer} color={colors.textMuted} />
      ) : picker.isError && cards.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t(errorMessageKey(picker.error))}
        </Text>
      ) : cards.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          {t('tags.cards.pickerEmpty')}
        </Text>
      ) : (
        cards.map((card) => (
          <TagCardRow
            key={card.id}
            card={card}
            tagName={tag?.name ?? ''}
            checked={selection.has(card.id)}
            onToggle={toggle}
            disabled={card.atTagLimit}
            note={card.atTagLimit ? t('tags.cards.atTagLimit') : undefined}
          />
        ))
      )}
      {picker.hasNextPage ? (
        <Pressable
          onPress={() => void picker.fetchNextPage()}
          disabled={picker.isFetchingNextPage}
          accessibilityRole="button"
          style={styles.more}
        >
          {picker.isFetchingNextPage ? (
            <ActivityIndicator color={colors.textMuted} />
          ) : (
            <Text style={[styles.more, { color: colors.primary }]}>{t('common.loadMore')}</Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  search: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
  },
  spacer: { marginVertical: spacing.lg },
  empty: { textAlign: 'center', marginVertical: spacing.lg, paddingHorizontal: spacing.xl },
  more: { alignItems: 'center', paddingVertical: spacing.lg, fontSize: 16, fontWeight: '600' },
});
