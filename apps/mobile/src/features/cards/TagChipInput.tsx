import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TagWithCount } from '../../api/types';
import { TagChip } from '../../components/TagChip';
import { spacing, useTheme } from '../../theme';

type Props = {
  value: string[];
  onChange: (names: string[]) => void;
  /** UI-02: every tag of the user, loaded once. */
  allTags: TagWithCount[];
  error?: string | null;
};

const MAX_SUGGESTIONS = 8;

/**
 * UI-01: chip input. Enter commits a chip; spaces are allowed inside a chip; `#` is only
 * shown, never typed into the name. The server normalizes and checks names (TAG-01).
 * UI-02: suggestions filter all tags on the phone, ignoring case, so "Animals" shows up
 * while typing "anim" before anyone creates "animals".
 */
export function TagChipInput({ value, onChange, allTags, error }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const suggestions = useMemo(() => {
    const query = text.trim().toLocaleLowerCase();
    if (!query) return [];
    return allTags
      .filter(
        (tag) =>
          tag.name.toLocaleLowerCase().includes(query) && !value.includes(tag.name),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [text, allTags, value]);

  const colorOf = (name: string) => allTags.find((tag) => tag.name === name)?.color;

  const commit = (name: string) => {
    const chip = name.trim();
    setText('');
    if (!chip || value.includes(chip)) return; // the same text twice is one chip
    onChange([...value, chip]);
  };

  return (
    <View>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        {value.map((name) => (
          <TagChip
            key={name}
            name={name}
            color={colorOf(name)}
            onPress={() => onChange(value.filter((n) => n !== name))}
            accessibilityLabel={t('editor.removeTag', { name })}
          />
        ))}
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => commit(text)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && text === '' && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          submitBehavior="submit"
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={value.length === 0 ? t('editor.tagPlaceholder') : undefined}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.text }]}
          testID="tag-input"
        />
      </View>
      {suggestions.length > 0 && (
        <View
          style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {suggestions.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => commit(tag.name)}
              accessibilityRole="button"
              style={styles.suggestion}
            >
              <Text style={{ color: colors.text }}>#{tag.name}</Text>
              <Text style={{ color: colors.textMuted }}>{tag.cardCount}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  input: { flexGrow: 1, minWidth: 120, fontSize: 16, paddingVertical: spacing.xs },
  suggestions: {
    marginTop: spacing.xs,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  error: { marginTop: spacing.xs, fontSize: 13 },
});
