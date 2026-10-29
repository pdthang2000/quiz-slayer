import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useTheme } from '../theme';

export type SheetAction = {
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
};

/** A bottom sheet of actions with Cancel at the end (UI-06, UI-10). */
export function ActionSheet({ visible, onClose, title, actions }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const item = ({ label, onPress, danger, testID }: SheetAction) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      testID={testID}
      onPress={() => {
        onClose();
        onPress();
      }}
      style={styles.item}
    >
      <Text style={[styles.label, { color: danger ? colors.danger : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {title ? (
            <Text style={[styles.title, { color: colors.textMuted }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {actions.map(item)}
          {item({ label: t('common.cancel'), onPress: () => {} })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: spacing.sm },
  title: {
    fontSize: 13,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  item: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  label: { fontSize: 17 },
});
