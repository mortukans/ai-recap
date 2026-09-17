import { formatTimestamp } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

interface Palette {
  text: string;
  textSecondary: string;
  backgroundElement: string;
}

/** Minimal playback of a recorded chunk (M1-9). Plays a single chunk for now. */
export function RecordingPlayer({ uri, palette }: { uri: string; palette: Palette }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const playing = status?.playing ?? false;

  const onToggle = () => {
    if (playing) {
      player.pause();
    } else {
      if ((status?.currentTime ?? 0) >= (status?.duration ?? 0) && (status?.duration ?? 0) > 0) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View style={[styles.bar, { backgroundColor: palette.backgroundElement }]}>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.btn}>
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={palette.text} />
      </Pressable>
      <Text style={[styles.time, { color: palette.textSecondary }]}>
        {formatTimestamp(status?.currentTime ?? 0)} / {formatTimestamp(status?.duration ?? 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.two },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
