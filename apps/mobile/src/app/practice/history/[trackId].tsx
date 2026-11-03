import { useLocalSearchParams } from 'expo-router';
import { HistoryList } from '../../../features/practice/HistoryList';

/** DP-26 */
export default function HistoryScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  return <HistoryList trackId={trackId} />;
}
