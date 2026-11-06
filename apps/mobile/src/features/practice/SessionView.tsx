import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, usePreventRemove } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey } from '../../api/errors';
import { ApiError } from '../../api/client';
import { practiceApi } from '../../api/practice';
import type { DailySession } from '../../api/types';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { formatDay, practiceKeys, useSession, useToday } from './hooks';
import { QuizCard } from './QuizCard';

/** Errors after which the screen shows the server's current state again. */
const RELOAD = new Set([
  'QuizAlreadyAnswered',
  'QuizOutOfOrder',
  'CannotSaveAsCard',
  'DailySessionClosed',
  'NoteChanged',
  'PracticeChanged',
  // DP-64: the card stopped fitting after this screen loaded (e.g. a longer note).
  'InvalidCardFront',
  'InvalidCardBack',
]);

/**
 * A daily session: quizzes one by one in order (DP-21), answer → feedback (DP-20) → Next,
 * progress in quizzes (DP-18), no timer (DP-24). Leaving keeps the progress (DP-22).
 * Finished: "23 / 28 correct" and the streak, then every quiz with the answers (DP-26).
 * DP-52: a closed set opens view only, with the quizzes that were answered.
 * DP-67: leaving with a typed note not saved asks first (Next, Close, Back).
 */
export function SessionView({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const session = useSession(id);
  const [selected, setSelected] = useState<(number | undefined)[]>([]);
  /** The quiz just answered, shown with its feedback until Next. */
  const [reviewing, setReviewing] = useState<string | null>(null);
  /** Questions whose note box holds typed text that is not saved. */
  const [typing, setTyping] = useState<ReadonlySet<string>>(new Set());
  const [closing, setClosing] = useState(false);

  const onNoteTyping = useCallback((questionId: string, isTyping: boolean) => {
    setTyping((old) => {
      if (old.has(questionId) === isTyping) return old;
      const next = new Set(old);
      if (isTyping) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  }, []);

  const askDiscard = useCallback(
    (discard: () => void) =>
      Alert.alert(t('practice.discardNote'), undefined, [
        { text: t('practice.keepEditing'), style: 'cancel' },
        { text: t('practice.discard'), style: 'destructive', onPress: discard },
      ]),
    [t],
  );
  const discardThen = (leave: () => void) => {
    if (typing.size === 0) return leave();
    askDiscard(() => {
      setTyping(new Set());
      leave();
    });
  };
  const close = () => discardThen(() => setClosing(true));

  // Back or a swipe.
  usePreventRemove(typing.size > 0, ({ repeat }) => {
    askDiscard(() => {
      setTyping(new Set());
      repeat();
    });
  });

  // Leave only after the re-render that turned the Back prompt off.
  useEffect(() => {
    if (closing) onClose();
  }, [closing, onClose]);

  const setSession = (s: DailySession) => queryClient.setQueryData(practiceKeys.session(id), s);
  const onError = (error: unknown) => {
    toast({ message: t(errorMessageKey(error)) });
    if (error instanceof ApiError && RELOAD.has(error.code)) void session.refetch();
  };

  const answer = useMutation({
    mutationFn: (input: { quizId: string; choices: number[] }) =>
      practiceApi.answer(id, input.quizId, input.choices),
    onSuccess: (s, input) => {
      setSession(s);
      setReviewing(input.quizId);
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: practiceKeys.today });
    },
    onError,
  });

  // DP-32: after the tap the button shows "Saved ✓".
  const saveAsCard = useMutation({
    mutationFn: (questionId: string) => practiceApi.saveAsCard(id, questionId),
    onSuccess: () => void session.refetch(),
    onError,
  });

  if (session.isPending) return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  if (session.isError) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textMuted }}>{t(errorMessageKey(session.error))}</Text>
        <Pressable onPress={() => void session.refetch()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  const s = session.data;
  const current = reviewing
    ? s.quizzes.find((q) => q.id === reviewing)!
    : s.closed
      ? undefined
      : s.quizzes.find((q) => !q.answer);

  // DP-64: a card that fits saves with one tap; one that doesn't opens the card editor.
  const onSaveAsCard = (questionId: string) => {
    const question = s.quizzes
      .flatMap((q) => q.answer?.questions ?? [])
      .find((q) => q.questionId === questionId);
    if (question?.cardDraft) {
      router.push({ pathname: '/practice/save-card', params: { sessionId: id, questionId } });
    } else saveAsCard.mutate(questionId);
  };

  if (!current) {
    return (
      <ResultView
        session={s}
        onClose={close}
        onSaveAsCard={onSaveAsCard}
        saving={saveAsCard.isPending}
        onNoteTyping={onNoteTyping}
      />
    );
  }

  const ready =
    current.questions.length > 0 && current.questions.every((_, i) => selected[i] !== undefined);
  const position = s.quizzes.indexOf(current) + 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.progress, { color: colors.text }]} testID="session-progress">
          {t('practice.progress', { answered: position, total: s.progress.total })}
        </Text>
        <Text style={[styles.tag, { color: colors.textMuted }]}>#{s.tagName}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {s.short && s.progress.answered === 0 ? (
          <Text style={[styles.banner, { color: colors.text, backgroundColor: colors.surfaceMuted }]} testID="short-banner">
            {t('practice.short', { count: s.progress.total })}
          </Text>
        ) : null}
        <QuizCard
          quiz={current}
          selected={selected}
          onSelect={(qi, ci) =>
            setSelected((old) => {
              const next = [...old];
              next[qi] = ci;
              return next;
            })
          }
          onSaveAsCard={onSaveAsCard}
          saving={saveAsCard.isPending}
          sessionId={id}
          onNoteTyping={onNoteTyping}
        />
      </ScrollView>
      <View style={styles.footer}>
        {reviewing ? (
          <Pressable
            onPress={() => discardThen(() => setReviewing(null))}
            accessibilityRole="button"
            testID="session-next"
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
              {s.finished ? t('practice.seeResult') : t('practice.next')}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => answer.mutate({ quizId: current.id, choices: selected as number[] })}
            disabled={!ready || answer.isPending}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            testID="session-check"
            style={[styles.button, { backgroundColor: colors.primary, opacity: ready ? 1 : 0.4 }]}
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{t('practice.check')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** DP-18, DP-23, DP-26: the result in questions, the track's streak, then the answers. */
function ResultView({
  session,
  onClose,
  onSaveAsCard,
  saving,
  onNoteTyping,
}: {
  session: DailySession;
  onClose: () => void;
  onSaveAsCard: (questionId: string) => void;
  saving: boolean;
  onNoteTyping: (questionId: string, typing: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = useToday();
  const streak = today.data?.tracks.find((x) => x.id === session.trackId)?.streak;
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.body}
      testID="session-result"
    >
      <Text style={[styles.done, { color: colors.text }]} testID="session-title">
        {session.finished ? t('practice.finished') : t('errors.DailySessionClosed')}
      </Text>
      <Text style={[styles.score, { color: colors.text }]} testID="session-score">
        {t('practice.result', session.result)}
      </Text>
      <Text style={{ color: colors.textMuted }}>
        #{session.tagName} · {formatDay(session.day)}
        {streak !== undefined && today.data?.day === session.day ? ` · ${t('practice.streak', { count: streak })}` : ''}
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        testID="session-close"
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{t('practice.close')}</Text>
      </Pressable>
      <Text style={[styles.reviewTitle, { color: colors.textMuted }]}>{t('practice.review')}</Text>
      {session.quizzes.filter((quiz) => quiz.answer).map((quiz) => (
        <View key={quiz.id} style={[styles.reviewItem, { borderColor: colors.border }]}>
          <QuizCard
            quiz={quiz}
            onSaveAsCard={onSaveAsCard}
            saving={saving}
            sessionId={session.id}
            onNoteTyping={onNoteTyping}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  progress: { fontSize: 17, fontWeight: '700' },
  tag: { fontSize: 15 },
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  banner: { padding: spacing.md, borderRadius: 10, fontSize: 15 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl },
  button: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: 12 },
  buttonText: { fontSize: 17, fontWeight: '700' },
  link: { fontSize: 16, fontWeight: '600' },
  done: { fontSize: 28, fontWeight: '800' },
  score: { fontSize: 22, fontWeight: '700' },
  reviewTitle: { fontSize: 15, fontWeight: '600', marginTop: spacing.lg },
  reviewItem: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.lg },
});
