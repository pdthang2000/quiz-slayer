import { RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { keys, useRefetchOnFocus } from '../../api/hooks';
import { CardTagsView } from '../../features/tags/CardTagsView';
import { spacing, useTheme } from '../../theme';
import { listDeceleration } from '../../theme/scroll';

/** UI-14: "⋯ → Tags" for one card. */
export default function CardTagsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.tags }),
      queryClient.invalidateQueries({ queryKey: keys.cards }),
    ]);
  useRefetchOnFocus(reload);
  return (
    <ScrollView
      decelerationRate={listDeceleration}
      // iOS 26+ draws the header over the content; let iOS inset below it.
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void reload()} tintColor={colors.textMuted} />
      }
    >
      <CardTagsView cardId={id} />
    </ScrollView>
  );
}
