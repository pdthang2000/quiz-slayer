import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useTheme } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTags: () => void;
  onDelete: () => void;
};

/** UI-10: "⋯" → Edit · Tags · Delete. */
export function CardMenu({ visible, onClose, onEdit, onTags, onDelete }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const item = (label: string, onPress: () => void, danger = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
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
          {item(t('cards.menu.edit'), onEdit)}
          {item(t('cards.menu.tags'), onTags)}
          {item(t('cards.menu.delete'), onDelete, true)}
          {item(t('common.cancel'), () => {})}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: spacing.sm },
  item: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  label: { fontSize: 17 },
});
