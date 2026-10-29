import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TagWithCount } from '../../api/types';
import { ActionSheet } from '../../components/ActionSheet';
import { TagChip } from '../../components/TagChip';
import { spacing } from '../../theme';

type Props = {
  /** READ-04: already A–Z from the server. */
  tags: TagWithCount[];
  onShowCards: (tag: TagWithCount) => void;
  onRename: (tag: TagWithCount) => void;
  onDelete: (tag: TagWithCount) => void;
};

/**
 * UI-06: tags as colored buttons (color: TAG-12). Long-press opens a bottom sheet with
 * Show cards · Rename · Delete. A tap shows the tag's cards (C-52, provisional).
 */
export function TagButtons({ tags, onShowCards, onRename, onDelete }: Props) {
  const { t } = useTranslation();
  const [sheetTag, setSheetTag] = useState<TagWithCount | null>(null);
  return (
    <View style={styles.wrap}>
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          count={tag.cardCount}
          large
          onPress={() => onShowCards(tag)}
          onLongPress={() => setSheetTag(tag)}
          accessibilityLabel={`#${tag.name}, ${t('tags.cardCount', { count: tag.cardCount })}`}
          testID={`tag-${tag.name}`}
        />
      ))}
      <ActionSheet
        visible={sheetTag !== null}
        onClose={() => setSheetTag(null)}
        title={sheetTag ? `#${sheetTag.name}` : undefined}
        actions={
          sheetTag
            ? [
                { label: t('tags.menu.showCards'), onPress: () => onShowCards(sheetTag) },
                { label: t('tags.menu.rename'), onPress: () => onRename(sheetTag) },
                {
                  label: t('tags.menu.delete'),
                  onPress: () => onDelete(sheetTag),
                  danger: true,
                },
              ]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.lg },
});
