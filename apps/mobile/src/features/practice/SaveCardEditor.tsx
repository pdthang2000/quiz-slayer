import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey, fieldOf, isStale } from '../../api/errors';
import { keys, useTags } from '../../api/hooks';
import { practiceApi } from '../../api/practice';
import type { CardDraft } from '../../api/types';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { TagChipInput } from '../cards/TagChipInput';
import { formatCount, practiceKeys, textLength, useSession } from './hooks';

/** CARD-02. The server decides; here it only drives the counters and the Save button. */
const FRONT_MAX = 500;
const BACK_MAX = 3000;

/** DP-64: the card editor for a card too long to save with one tap. */
export function SaveCardEditor({ sessionId, questionId }: { sessionId: string; questionId: string }) {
  const { colors } = useTheme();
  const session = useSession(sessionId);
  const draft = session.data?.quizzes
    .flatMap((q) => q.answer?.questions ?? [])
    .find((q) => q.questionId === questionId)?.cardDraft;

  // Nothing to edit any more (e.g. saved on another device): back to the quiz.
  const gone = session.isError || (!!session.data && !draft);
  useEffect(() => {
    if (gone) router.back();
  }, [gone]);

  if (!draft) return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  return <Form sessionId={sessionId} questionId={questionId} draft={draft} />;
}

function Form({ sessionId, questionId, draft }: { sessionId: string; questionId: string; draft: CardDraft }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const tags = useTags();
  const [front, setFront] = useState(draft.front);
  const [back, setBack] = useState(draft.back);
  const [tagNames, setTagNames] = useState([draft.tagName]);

  const fits = textLength(front) <= FRONT_MAX && textLength(back) <= BACK_MAX;

  const save = useMutation({
    mutationFn: () => practiceApi.saveAsCard(sessionId, questionId, { front, back, tagNames }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: practiceKeys.session(sessionId) }),
        queryClient.invalidateQueries({ queryKey: keys.cards }),
        queryClient.invalidateQueries({ queryKey: keys.tags }),
      ]);
      router.back(); // the quiz or result now shows "Saved ✓" (DP-32); no extra pop-up
    },
    onError: (error) => {
      if (isStale(error)) {
        toast({ message: t(errorMessageKey(error)) });
        router.back();
      }
    },
  });

  const field = save.error ? fieldOf(save.error) : null;
  const errorFor = (name: 'front' | 'back' | 'tags') =>
    field === name ? (
      <Text style={[styles.fieldError, { color: colors.danger }]}>{t(errorMessageKey(save.error))}</Text>
    ) : null;
  const counter = (value: string, max: number, name: string) => {
    const length = textLength(value);
    return (
      <Text
        style={[styles.counter, { color: length > max ? colors.danger : colors.textMuted }]}
        testID={`counter-${name}`}
      >
        {t('practice.cardCounter', { count: formatCount(length), max: formatCount(max) })}
      </Text>
    );
  };
  const inputStyle = (value: string, max: number) => [
    styles.input,
    {
      backgroundColor: colors.surface,
      color: colors.text,
      borderColor: textLength(value) > max ? colors.danger : colors.border,
    },
  ];
  const canSave = fits && !save.isPending;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: t('practice.saveAsCard'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} accessibilityRole="button" testID="save-card-cancel">
              <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.cancel')}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => save.mutate()}
              disabled={!canSave}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              testID="save-card-save"
            >
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600', opacity: canSave ? 1 : 0.4 }}>
                {t('common.save')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('editor.front')}</Text>
        <TextInput value={front} onChangeText={setFront} multiline style={inputStyle(front, FRONT_MAX)} testID="front" />
        {counter(front, FRONT_MAX, 'front')}
        {errorFor('front')}

        <Text style={[styles.label, { color: colors.textMuted }]}>{t('editor.back')}</Text>
        <TextInput
          value={back}
          onChangeText={setBack}
          multiline
          style={[inputStyle(back, BACK_MAX), styles.back]}
          testID="back"
        />
        {counter(back, BACK_MAX, 'back')}
        {errorFor('back')}

        <Text style={[styles.label, { color: colors.textMuted }]}>{t('editor.tags')}</Text>
        <TagChipInput
          value={tagNames}
          onChange={setTagNames}
          allTags={tags.data ?? []}
          error={field === 'tags' ? t(errorMessageKey(save.error)) : null}
        />
        {save.error && !field && !isStale(save.error) ? (
          <Text style={[styles.fieldError, { color: colors.danger }]}>{t(errorMessageKey(save.error))}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xs },
  label: { fontSize: 13, marginTop: spacing.md, textTransform: 'uppercase' },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    fontSize: 17,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  back: { minHeight: 120 },
  counter: { fontSize: 13, textAlign: 'right' },
  fieldError: { fontSize: 13 },
});
