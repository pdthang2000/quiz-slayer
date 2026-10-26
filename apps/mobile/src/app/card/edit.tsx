import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { cardsApi, type CardInput } from '../../api/cards';
import { ApiError } from '../../api/client';
import { errorMessageKey, fieldOf, isStale } from '../../api/errors';
import { keys, useTags } from '../../api/hooks';
import type { Card } from '../../api/types';
import { useToast } from '../../components/Toast';
import { TagChipInput } from '../../features/cards/TagChipInput';
import { spacing, useTheme } from '../../theme';

/**
 * New card, or edit one. Loads the card, then shows the form for exactly that version.
 * After a reload (CONFLICT-01) the form starts again from the fresh card.
 */
export default function CardEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();

  const existing = useQuery({
    queryKey: keys.card(id ?? ''),
    queryFn: () => cardsApi.get(id!),
    enabled: !!id,
    gcTime: 0,
  });

  // The card is gone or in the Trash: say so and leave.
  useEffect(() => {
    if (existing.error) {
      toast({ message: t(errorMessageKey(existing.error)) });
      router.back();
    }
  }, [existing.error, toast, t]);

  if (id && !existing.data) {
    return <ActivityIndicator style={styles.center} color={colors.textMuted} />;
  }
  return (
    <EditorForm
      key={existing.dataUpdatedAt}
      card={existing.data ?? null}
      reload={() => void existing.refetch()}
    />
  );
}

/**
 * CARD-07: one Save sends front, back and the full tag list.
 * CARD-08: an edit sends the version this form was filled from; if the card changed
 * elsewhere the server answers CardChanged, and the editor reloads the card.
 * UI-15: leaving with unsaved changes (Cancel, Back, swipe down) asks "Discard changes?".
 */
function EditorForm({ card, reload }: { card: Card | null; reload: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const tags = useTags();

  const [form, setForm] = useState<CardInput>({
    front: card?.front ?? '',
    back: card?.back ?? '',
    tags: card?.tags.map((tag) => tag.name) ?? [],
  });
  const [error, setError] = useState<unknown>(null);
  const [leaving, setLeaving] = useState<'saved' | 'discarded' | null>(null);

  const changed =
    form.front !== (card?.front ?? '') ||
    form.back !== (card?.back ?? '') ||
    !sameNames(form.tags, card?.tags.map((tag) => tag.name) ?? []);

  usePreventRemove(changed && !leaving, ({ repeat }) => {
    Alert.alert(t('editor.discardTitle'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('editor.discard'),
        style: 'destructive',
        onPress: () => {
          setLeaving('discarded');
          repeat();
        },
      },
    ]);
  });

  // Leave only after the re-render that turned the discard prompt off.
  useEffect(() => {
    if (leaving === 'saved') router.back();
  }, [leaving]);

  const save = useMutation({
    mutationFn: (input: CardInput) =>
      card ? cardsApi.edit(card, input) : cardsApi.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.cards }),
        queryClient.invalidateQueries({ queryKey: keys.tags }), // UI-02: new tags
      ]);
      setLeaving('saved');
    },
    onError: (e) => {
      setError(e);
      if (isStale(e)) {
        toast({ message: t(errorMessageKey(e)) });
        reload(); // CONFLICT-01: reload the screen
      }
    },
  });

  const field = fieldOf(error);
  const messageFor = (name: 'front' | 'back' | 'tags') =>
    field === name ? t(errorMessageKey(error)) : null;
  const otherError =
    error instanceof ApiError && !field && !isStale(error)
      ? t(errorMessageKey(error))
      : null;

  const set = (patch: Partial<CardInput>) => {
    setError(null);
    setForm((f) => ({ ...f, ...patch }));
  };

  const inputStyle = (name: 'front' | 'back') => [
    styles.input,
    {
      backgroundColor: colors.surface,
      color: colors.text,
      borderColor: messageFor(name) ? colors.danger : colors.border,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title: card ? t('cards.edit') : t('cards.new'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={{ color: colors.primary, fontSize: 17 }}>
                {t('common.cancel')}
              </Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => save.mutate(form)}
              disabled={save.isPending}
              accessibilityRole="button"
              testID="save"
            >
              <Text
                style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}
              >
                {t('common.save')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t('editor.front')}
        </Text>
        <TextInput
          value={form.front}
          onChangeText={(front) => set({ front })}
          multiline
          style={inputStyle('front')}
          testID="front"
        />
        <FieldError message={messageFor('front')} color={colors.danger} />

        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t('editor.back')}
        </Text>
        <TextInput
          value={form.back}
          onChangeText={(back) => set({ back })}
          multiline
          style={[inputStyle('back'), styles.back]}
          testID="back"
        />
        <FieldError message={messageFor('back')} color={colors.danger} />

        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t('editor.tags')}
        </Text>
        <TagChipInput
          value={form.tags}
          onChange={(names) => set({ tags: names })}
          allTags={tags.data ?? []}
          error={messageFor('tags')}
        />
        {otherError ? (
          <Text style={[styles.otherError, { color: colors.danger }]}>
            {otherError}
          </Text>
        ) : null}
        {save.isPending ? <ActivityIndicator color={colors.textMuted} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function sameNames(a: string[], b: string[]) {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

function FieldError({ message, color }: { message: string | null; color: string }) {
  if (!message) return null;
  return <Text style={[styles.fieldError, { color }]}>{message}</Text>;
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
  fieldError: { fontSize: 13 },
  otherError: { marginTop: spacing.md, fontSize: 14 },
});
