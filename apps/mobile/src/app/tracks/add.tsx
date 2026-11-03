import { router } from 'expo-router';
import { AddTrackList } from '../../features/practice/TrackScreens';

/** G-2 */
export default function AddTrackScreen() {
  return <AddTrackList onAdded={() => router.back()} />;
}
