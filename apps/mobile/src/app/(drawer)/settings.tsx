import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppearancePicker } from '../../features/settings/AppearancePicker';
import { spacing, useTheme } from '../../theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      {/* G-2: Settings → Tracks (add, kinds, daily size). */}
      <Pressable
        onPress={() => router.push('/tracks')}
        accessibilityRole="button"
        testID="settings-tracks"
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>{t('nav.tracks')}</Text>
        <Text style={{ color: colors.textMuted }}>›</Text>
      </Pressable>
      <AppearancePicker />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 16 },
});
