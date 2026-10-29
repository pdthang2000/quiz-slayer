import { useTranslation } from 'react-i18next';
import { ActionSheet } from '../../components/ActionSheet';

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
  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      actions={[
        { label: t('cards.menu.edit'), onPress: onEdit },
        { label: t('cards.menu.tags'), onPress: onTags },
        { label: t('cards.menu.delete'), onPress: onDelete, danger: true },
      ]}
    />
  );
}
