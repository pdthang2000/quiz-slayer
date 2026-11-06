import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { spacing, useTheme } from '../../theme';
import { formatDay, useBestStreak, useHistory } from './hooks';

/**
 * DP-26: a track's days with their result, newest first; a tap shows that day's answers.
 * DP-69: the best streak in the header, hidden while it is 0.
 */
export function HistoryList({ trackId }: { trackId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const history = useHistory(trackId);
  const best = useBestStreak(trackId);

  if (history.isPending) return <ActivityIndicator style={styles.spacer} color={colors.textMuted} />;
  if (history.isError) {
    return <Text style={[styles.empty, { color: colors.textMuted }]}>{t(errorMessageKey(history.error))}</Text>;
  }
  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={history.data}
      keyExtractor={(s) => s.id}
      refreshControl={
        <RefreshControl refreshing={history.isRefetching} onRefresh={() => {
            void history.refetch();
            void best.refetch();
          }} tintColor={colors.textMuted} />
      }
      ListHeaderComponent={
        best.data && best.data.bestStreak > 0 ? (
          <Text style={[styles.best, { color: colors.text }]} testID="history-best">
            {t('practice.bestDays', { count: best.data.bestStreak })}
          </Text>
        ) : undefined
      }
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>{t('practice.noHistory')}</Text>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/practice/[id]', params: { id: item.id } })}
          accessibilityRole="button"
          testID={`day-${item.day}`}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.day, { color: colors.text }]}>{formatDay(item.day)}</Text>
          <Text style={{ color: item.finished ? colors.text : colors.textMuted }}>
            {item.finished ? t('practice.dayResult', item.result) : t('practice.unfinished', item.progress)}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  spacer: { marginVertical: spacing.xl },
  best: { fontSize: 16, fontWeight: '600', marginHorizontal: spacing.lg, marginTop: spacing.lg },
  empty: { textAlign: 'center', marginTop: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  day: { fontSize: 16, fontWeight: '600' },
});
