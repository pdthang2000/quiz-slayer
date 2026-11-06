import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { useRefetchOnFocus } from '../../api/hooks';
import { practiceApi } from '../../api/practice';
import type { TodayTrack } from '../../api/types';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { practiceKeys, useToday } from './hooks';

/**
 * G-1, G-5: the Today screen — overall streak at the top, then each track with today's
 * progress (DP-18 quizzes), its streak (DP-19) and Start / Continue / Done. DP-69: the best
 * streak under the overall one, hidden while it is 0. DP-63: yesterday's set, while it can still be finished.
 */
export function TodayView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = useToday();
  useRefetchOnFocus(today.refetch);

  // DP-31: the set is chosen when Start is tapped; DP-22: Continue resumes it.
  const start = useMutation({
    mutationFn: (track: TodayTrack) =>
      track.session ? Promise.resolve({ id: track.session.id }) : practiceApi.start(track.id),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: practiceKeys.today });
      router.push({ pathname: '/practice/[id]', params: { id: session.id } });
    },
    onError: (error) => {
      toast({ message: t(errorMessageKey(error)) });
      void today.refetch();
    },
  });

  if (today.isPending) return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  if (today.isError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(today.error))}</Text>
        <Pressable onPress={() => void today.refetch()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const { overallStreak, overallBestStreak, tracks } = today.data;
  const open = (id: string) => router.push({ pathname: '/practice/[id]', params: { id } });
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={today.isRefetching}
          onRefresh={() => void today.refetch()}
          tintColor={colors.textMuted}
        />
      }
    >
      <Text style={[styles.overall, { color: colors.text }]} testID="overall-streak">
        {t('practice.overallStreak', { count: overallStreak })}
      </Text>
      {overallBestStreak > 0 ? (
        <Text style={[styles.best, { color: colors.textMuted }]} testID="overall-best">
          {t('practice.bestOverall', { count: overallBestStreak })}
        </Text>
      ) : null}

      {tracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.muted, { color: colors.textMuted }]}>{t('practice.noTracks')}</Text>
          <Pressable onPress={() => router.push('/tracks/add')} accessibilityRole="button" testID="add-first-track">
            <Text style={[styles.link, { color: colors.primary }]}>{t('practice.addTrack')}</Text>
          </Pressable>
        </View>
      ) : (
        tracks.map((track) => {
          const s = track.session;
          const label = !s ? t('practice.start') : s.finished ? t('practice.done') : t('practice.continue');
          return (
            <View
              key={track.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              testID={`track-${track.tagName}`}
            >
              <View style={styles.row}>
                <Text style={[styles.tag, { color: colors.text }]}>#{track.tagName}</Text>
                <Text style={[styles.streak, { color: colors.text }]} testID={`streak-${track.tagName}`}>
                  {t('practice.streak', { count: track.streak })}
                </Text>
              </View>
              <Text style={[styles.muted, { color: colors.textMuted }]} testID={`progress-${track.tagName}`}>
                {s ? t('practice.progress', s.progress) : t('practice.notStarted')}
              </Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => router.push({ pathname: '/practice/history/[trackId]', params: { trackId: track.id } })}
                  accessibilityRole="button"
                  testID={`history-${track.tagName}`}
                >
                  <Text style={[styles.link, { color: colors.primary }]}>{t('practice.history')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => start.mutate(track)}
                  disabled={start.isPending}
                  accessibilityRole="button"
                  testID={`start-${track.tagName}`}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{label}</Text>
                </Pressable>
              </View>
              {track.yesterdaySession ? (
                <View style={styles.row} testID={`yesterday-${track.tagName}`}>
                  <Text style={[styles.yesterday, { color: colors.text }]}>
                    {t('practice.finishYesterday', track.yesterdaySession.progress)}
                  </Text>
                  <Pressable
                    onPress={() => open(track.yesterdaySession!.id)}
                    accessibilityRole="button"
                    testID={`continue-yesterday-${track.tagName}`}
                  >
                    <Text style={[styles.link, { color: colors.primary }]}>{t('practice.continue')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  content: { padding: spacing.lg, gap: spacing.md },
  overall: { fontSize: 22, fontWeight: '700' },
  best: { fontSize: 14 },
  yesterday: { fontSize: 15, flexShrink: 1 },
  empty: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { fontSize: 18, fontWeight: '700' },
  streak: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  link: { fontSize: 16, fontWeight: '600' },
  button: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: 10 },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
