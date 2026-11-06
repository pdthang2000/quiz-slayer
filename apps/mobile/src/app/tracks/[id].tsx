import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrackSettings } from '../../features/practice/TrackScreens';
import { useTracks } from '../../features/practice/hooks';
import { useTheme } from '../../theme';

/** DP-12, DP-13, DP-15 */
export default function TrackSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tracks = useTracks();
  const track = tracks.data?.find((x) => x.id === id);
  return (
    <>
      <Stack.Screen options={{ title: track ? `#${track.tagName}` : '' }} />
      {track ? (
        <TrackSettings key={`${track.id}-${track.version}`} track={track} onRemoved={() => router.back()} />
      ) : tracks.data ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 48 }}>{t('errors.TrackNotFound')}</Text>
      ) : null}
    </>
  );
}
