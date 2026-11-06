import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey, isStale } from '../../api/errors';
import { practiceApi } from '../../api/practice';
import type { QuizKind, Track } from '../../api/types';
import { Checkbox } from '../../components/Checkbox';
import { confirm } from '../../components/confirm';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { practiceKeys, useTrackOptions, useTracks } from './hooks';

const KINDS: QuizKind[] = ['single', 'singleAudio', 'readingGroup', 'audioGroup'];

/** DP-09: Settings → Tracks. */
export function TrackList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tracks = useTracks();
  if (tracks.isPending) return <ActivityIndicator style={styles.spacer} color={colors.textMuted} />;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {tracks.isError ? (
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(tracks.error))}</Text>
      ) : tracks.data.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>{t('tracks.empty')}</Text>
      ) : (
        tracks.data.map((track) => (
          <Pressable
            key={track.id}
            onPress={() => router.push({ pathname: '/tracks/[id]', params: { id: track.id } })}
            accessibilityRole="button"
            testID={`track-row-${track.tagName}`}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.name, { color: colors.text }]}>#{track.tagName}</Text>
            <Text style={{ color: colors.textMuted }}>{t('tracks.perDay', { count: track.dailySize })}</Text>
          </Pressable>
        ))
      )}
      <Pressable onPress={() => router.push('/tracks/add')} accessibilityRole="button" testID="add-track">
        <Text style={[styles.link, { color: colors.primary }]}>{t('tracks.add')}</Text>
      </Pressable>
    </ScrollView>
  );
}

/** G-2: pick a question tag that has quizzes, with its count. Tags already followed are greyed. */
export function AddTrackList({ onAdded }: { onAdded: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const options = useTrackOptions();
  const add = useMutation({
    mutationFn: practiceApi.addTrack,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: practiceKeys.all });
      onAdded();
    },
    onError: (error) => toast({ message: t(errorMessageKey(error)) }),
  });
  if (options.isPending) return <ActivityIndicator style={styles.spacer} color={colors.textMuted} />;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {options.isError ? (
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(options.error))}</Text>
      ) : options.data.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>{t('tracks.noOptions')}</Text>
      ) : (
        options.data.map((option) => (
          <Pressable
            key={option.name}
            onPress={() => add.mutate(option.name)}
            disabled={option.tracked || add.isPending}
            accessibilityRole="button"
            accessibilityState={{ disabled: option.tracked }}
            testID={`option-${option.name}`}
            style={[
              styles.row,
              { backgroundColor: colors.surface, borderColor: colors.border, opacity: option.tracked ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.name, { color: colors.text }]}>#{option.name}</Text>
            <Text style={{ color: colors.textMuted }}>
              {option.tracked ? t('tracks.added') : t('tracks.quizCount', { count: option.quizCount })}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

/** DP-12, DP-13, DP-15: a track's kinds and daily size; remove (history is kept). */
export function TrackSettings({ track, onRemoved }: { track: Track; onRemoved: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [kinds, setKinds] = useState<QuizKind[]>(track.kinds);
  const [dailySize, setDailySize] = useState(track.dailySize);
  const changed = dailySize !== track.dailySize || kinds.join() !== track.kinds.join();

  const done = () => void queryClient.invalidateQueries({ queryKey: practiceKeys.all });
  // DP-53, CONFLICT-01: outdated → the message, then the latest settings.
  const onError = (error: unknown) => {
    toast({ message: t(errorMessageKey(error)) });
    if (isStale(error)) done();
  };
  const save = useMutation({
    mutationFn: () => practiceApi.changeTrack(track, { kinds, dailySize }),
    onSuccess: () => {
      toast({ message: t('tracks.saved') });
      done();
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => practiceApi.removeTrack(track),
    onSuccess: () => {
      toast({ message: t('tracks.removed') });
      done();
      onRemoved();
    },
    onError,
  });

  const toggle = (kind: QuizKind) =>
    setKinds((old) => (old.includes(kind) ? old.filter((k) => k !== kind) : KINDS.filter((k) => k === kind || old.includes(k))));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.heading, { color: colors.textMuted }]}>{t('tracks.dailySize')}</Text>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => setDailySize((n) => Math.max(1, n - 1))}
          accessibilityRole="button"
          testID="size-minus"
          style={[styles.step, { borderColor: colors.border }]}
        >
          <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.size, { color: colors.text }]} testID="daily-size">
          {dailySize}
        </Text>
        <Pressable
          onPress={() => setDailySize((n) => Math.min(50, n + 1))}
          accessibilityRole="button"
          testID="size-plus"
          style={[styles.step, { borderColor: colors.border }]}
        >
          <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>

      <Text style={[styles.heading, { color: colors.textMuted }]}>{t('tracks.kinds')}</Text>
      {KINDS.map((kind) => (
        <View key={kind} style={styles.kind}>
          <Checkbox
            checked={kinds.includes(kind)}
            onPress={() => toggle(kind)}
            accessibilityLabel={t(`tracks.kind.${kind}`)}
            testID={`kind-${kind}`}
          />
          <Text style={{ color: colors.text, fontSize: 16 }}>{t(`tracks.kind.${kind}`)}</Text>
        </View>
      ))}

      <Pressable
        onPress={() => save.mutate()}
        disabled={!changed || save.isPending}
        accessibilityRole="button"
        accessibilityState={{ disabled: !changed }}
        testID="track-save"
        style={[styles.button, { backgroundColor: colors.primary, opacity: changed ? 1 : 0.4 }]}
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{t('tracks.save')}</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          const ok = await confirm(
            t('tracks.removeConfirm', { name: track.tagName }),
            t('tracks.removeAction'),
            t('common.cancel'),
            true,
          );
          if (ok) remove.mutate();
        }}
        accessibilityRole="button"
        testID="track-remove"
      >
        <Text style={[styles.link, { color: colors.danger }]}>{t('tracks.remove')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  spacer: { marginVertical: spacing.xl },
  content: { padding: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 14, fontWeight: '600', marginTop: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22 },
  size: { fontSize: 22, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  kind: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  button: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: 12, marginTop: spacing.lg },
  buttonText: { fontSize: 17, fontWeight: '700' },
});
