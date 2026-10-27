import { ScrollView } from 'react-native';
import { AppearancePicker } from '../../features/settings/AppearancePicker';
import { spacing, useTheme } from '../../theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg }}
    >
      <AppearancePicker />
    </ScrollView>
  );
}
