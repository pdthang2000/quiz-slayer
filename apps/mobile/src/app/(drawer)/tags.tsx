import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { useRefetchOnFocus, useTags } from '../../api/hooks';
import type { TagWithCount } from '../../api/types';
import { RenameTagDialog } from '../../features/tags/RenameTagDialog';
import { TagButtons } from '../../features/tags/TagButtons';
import { useTagActions } from '../../features/tags/useTagActions';
import { spacing, useTheme } from '../../theme';
import { listDeceleration } from '../../theme/scroll';

/** UI-05: the Tag list, where tags are renamed and deleted. READ-04: A–Z. */
export default function TagsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tags = useTags();
  const { rename, askDelete, showError } = useTagActions();
  const [renaming, setRenaming] = useState<TagWithCount | null>(null);
  useRefetchOnFocus(tags.refetch);

  const showCards = (tag: TagWithCount) =>
    router.push({ pathname: '/tag/[id]', params: { id: tag.id } });

  if (tags.isPending) {
    return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  }
  if (tags.isError && !tags.data) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(tags.error))}</Text>
        <Pressable onPress={() => void tags.refetch()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <>
      <ScrollView
        decelerationRate={listDeceleration}
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={tags.isRefetching}
            onRefresh={() => void tags.refetch()}
            tintColor={colors.textMuted}
          />
        }
      >
        {tags.data.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{t('tags.empty')}</Text>
        ) : (
          <TagButtons
            tags={tags.data}
            onShowCards={showCards}
            onRename={setRenaming}
            onDelete={(tag) => void askDelete(tag)}
          />
        )}
      </ScrollView>
      {renaming ? (
        <RenameTagDialog
          tag={renaming}
          onClose={() => setRenaming(null)}
          onRename={rename}
          onError={showError}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { flexGrow: 1 },
  link: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: spacing.xl * 2, paddingHorizontal: spacing.xl },
});
