import { View } from 'react-native';
import { useRefetchOnFocus, useTrash } from '../../api/hooks';
import { TrashList } from '../../features/trash/TrashList';
import { useTheme } from '../../theme';

/** The Trash tab (TRASH-07, TRASH-11, TRASH-12). */
export default function TrashScreen() {
  const { colors } = useTheme();
  const trash = useTrash();
  useRefetchOnFocus(trash.refetch);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TrashList />
    </View>
  );
}
