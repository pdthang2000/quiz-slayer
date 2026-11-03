import { Pressable, StyleSheet, Text } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing, useTheme } from '../../theme';

/** DP-25: audio can be replayed any number of times. A simple player (seed has no audio). */
export function AudioPlayer({ url, testID }: { url: string; testID?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const player = useAudioPlayer(url);
  const [played, setPlayed] = useState(false);
  return (
    <Pressable
      onPress={() => {
        void player.seekTo(0);
        player.play();
        setPlayed(true);
      }}
      accessibilityRole="button"
      testID={testID}
      style={[styles.button, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <Text style={[styles.text, { color: colors.primary }]}>
        {played ? t('practice.replay') : t('practice.play')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 16, fontWeight: '600' },
});
