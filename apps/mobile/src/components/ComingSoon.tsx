import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../theme';

/** Placeholder for screens of later slices. */
export function ComingSoon() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textMuted }}>{t('common.comingSoon')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
