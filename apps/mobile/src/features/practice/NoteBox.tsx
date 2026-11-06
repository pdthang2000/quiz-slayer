import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessageKey, isStale } from '../../api/errors';
import { practiceApi } from '../../api/practice';
import { useToast } from '../../components/Toast';
import { spacing, useTheme } from '../../theme';
import { formatCount, practiceKeys, textLength } from './hooks';

/** DP-46. The server decides; here it only drives the counter and the Save button. */
const NOTE_MAX = 1000;

type Props = {
  sessionId: string;
  questionId: string;
  note: string | null;
  version: number;
  /** DP-67: this box holds typed text that is not saved. */
  onTyping: (questionId: string, typing: boolean) => void;
};

/**
 * DP-66: "📝 Add note", or the note with Edit; while typing a counter, red over the limit
 * with Save off. DP-47: saved with Save only. DP-50: the version the screen showed goes
 * with it; outdated → the message and the latest note.
 */
export function NoteBox({ sessionId, questionId, note, version, onTyping }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState<string | null>(null);

  const stop = () => {
    setText(null);
    onTyping(questionId, false);
  };
  const reload = () => queryClient.invalidateQueries({ queryKey: practiceKeys.session(sessionId) });

  const save = useMutation({
    mutationFn: (value: string) => practiceApi.writeNote(sessionId, questionId, value, version),
    onSuccess: async () => {
      await reload();
      stop();
    },
    onError: (error) => {
      toast({ message: t(errorMessageKey(error)) });
      if (isStale(error)) {
        void reload();
        stop();
      }
    },
  });

  if (text === null) {
    const open = () => setText(note ?? '');
    return note ? (
      <View style={styles.box} testID={`note-${questionId}`}>
        <Text style={{ color: colors.text }}>{note}</Text>
        <Pressable onPress={open} accessibilityRole="button" testID={`note-edit-${questionId}`}>
          <Text style={[styles.link, { color: colors.primary }]}>{t('practice.editNote')}</Text>
        </Pressable>
      </View>
    ) : (
      <Pressable onPress={open} accessibilityRole="button" testID={`note-add-${questionId}`}>
        <Text style={[styles.link, { color: colors.primary }]}>{t('practice.addNote')}</Text>
      </Pressable>
    );
  }

  const length = textLength(text);
  const tooLong = length > NOTE_MAX;
  const change = (value: string) => {
    setText(value);
    onTyping(questionId, value !== (note ?? ''));
  };

  return (
    <View style={styles.box}>
      <TextInput
        value={text}
        onChangeText={change}
        multiline
        autoFocus
        testID={`note-input-${questionId}`}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: tooLong ? colors.danger : colors.border },
        ]}
      />
      <Text
        style={[styles.counter, { color: tooLong ? colors.danger : colors.textMuted }]}
        testID={`note-counter-${questionId}`}
      >
        {t('practice.noteCounter', { count: formatCount(length) })}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={stop} accessibilityRole="button" testID={`note-cancel-${questionId}`}>
          <Text style={[styles.link, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={() => save.mutate(text)}
          disabled={tooLong || save.isPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: tooLong }}
          testID={`note-save-${questionId}`}
          style={{ opacity: tooLong ? 0.4 : 1 }}
        >
          <Text style={[styles.link, { color: colors.primary }]}>{t('common.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.xs, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counter: { fontSize: 13, textAlign: 'right' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  link: { fontSize: 16, fontWeight: '600' },
});
