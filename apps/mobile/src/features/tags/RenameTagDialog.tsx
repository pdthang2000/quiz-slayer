import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { errorMessageKey, fieldOf } from '../../api/errors';
import type { Tag } from '../../api/types';
import { spacing, useTheme } from '../../theme';

type Props = {
  tag: Tag;
  onClose: () => void;
  /** Resolves true when done, false when the user backed out of a merge. */
  onRename: (tag: Tag, name: string) => Promise<boolean>;
  onError: (error: unknown) => void;
};

/**
 * TAG-11: rename from the Tag list. A leading "#" is dropped, as in the chip input (UI-01).
 * Name errors (TAG-01) stay in the dialog next to the field; anything else closes it.
 */
export function RenameTagDialog({ tag, onClose, onRename, onError }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [name, setName] = useState(tag.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = name.trim().replace(/^#+/, '').trim();
    setBusy(true);
    try {
      if (await onRename(tag, clean)) onClose();
    } catch (e) {
      if (fieldOf(e) === 'tags') setError(t(errorMessageKey(e)));
      else {
        onClose();
        onError(e);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('tags.rename.title', { name: tag.name })}
          </Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            onSubmitEditing={() => void submit()}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
            placeholder={t('tags.rename.placeholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
            testID="rename-input"
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: error ? colors.danger : colors.border,
              },
            ]}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <View style={styles.buttons}>
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.button}>
              <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              accessibilityRole="button"
              testID="rename-save"
              style={styles.button}
            >
              {busy ? (
                <ActivityIndicator color={colors.textMuted} />
              ) : (
                <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>
                  {t('common.save')}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#00000066',
  },
  dialog: { borderRadius: 14, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 17, fontWeight: '600' },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
  },
  error: { fontSize: 13 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  button: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 48 },
});
