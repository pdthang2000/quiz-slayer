import { router, useLocalSearchParams } from 'expo-router';
import { SessionView } from '../../features/practice/SessionView';

/** A daily session (DP-20..DP-23), or a past day's answers (DP-26). */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionView id={id} onClose={() => router.back()} />;
}
