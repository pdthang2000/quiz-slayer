import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../../theme';
import { APPEARANCES, useAppearance } from '../../theme/appearance';

/** UI-17: Appearance — System (default) / Light / Dark. */
export function AppearancePicker() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { appearance, setAppearance } = useAppearance();

  return (
    <View>
      <Text style={[styles.heading, { color: colors.textMuted }]}>
        {t('settings.appearance')}
      </Text>
      <View
        style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {APPEARANCES.map((option, i) => {
          const selected = option === appearance;
          return (
            <Pressable
              key={option}
              onPress={() => setAppearance(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              testID={`appearance-${option}`}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                {t(`settings.${option}`)}
              </Text>
              <View
                style={[
                  styles.radio,
                  { borderColor: selected ? colors.primary : colors.border },
                ]}
              >
                {selected ? (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  label: { fontSize: 17 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
