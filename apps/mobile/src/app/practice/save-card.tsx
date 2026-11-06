import { useLocalSearchParams } from 'expo-router';
import { SaveCardEditor } from '../../features/practice/SaveCardEditor';

/** DP-64: Save as card when the card doesn't fit. */
export default function SaveCardScreen() {
  const { sessionId, questionId } = useLocalSearchParams<{ sessionId: string; questionId: string }>();
  return <SaveCardEditor sessionId={sessionId} questionId={questionId} />;
}
