import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { keys, useRefetchOnFocus, useTags } from '../../../api/hooks';
import { TagCards } from '../../../features/tags/TagCards';
import { spacing, useTheme } from '../../../theme';

/** A tag's card list, opened from the Tag list (UI-05, UI-06 "Show cards"). */
export default function TagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const tags = useTags();
  const tag = tags.data?.find((x) => x.id === id);

  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.tags }),
      queryClient.invalidateQueries({ queryKey: keys.cards }),
    ]);
  useRefetchOnFocus(reload);

  return (
    <ScrollView
      // iOS 26+ draws the header over the content; let iOS inset below it.
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={tags.isRefetching}
          onRefresh={() => void reload()}
          tintColor={colors.textMuted}
        />
      }
    >
      <Stack.Screen options={{ title: tag ? `#${tag.name}` : '' }} />
      {tag ? (
        <TagCards tag={tag} />
      ) : tags.data ? (
        // Deleted or merged elsewhere.
        <Text style={[styles.gone, { color: colors.textMuted }]}>{t('errors.TagNotFound')}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  gone: { textAlign: 'center', marginTop: spacing.xl * 2 },
});
