import { formatTimestamp } from '@ai-recap/core';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

interface Palette {
  text: string;
  textSecondary: string;
  backgroundElement: string;
}

export interface PlayChunk {
  uri: string;
  duration: number;
}

/** Sequential playback across a recap's audio chunks (M1-9). Advances to the next chunk on finish. */
export function RecordingPlayer({ chunks, palette }: { chunks: PlayChunk[]; palette: Palette }) {
  const [index, setIndex] = useState(0);
  const [wantPlay, setWantPlay] = useState(false);
  const current = chunks[index];
  const player = useAudioPlayer(current ? { uri: current.uri } : null);
  const status = useAudioPlayerStatus(player);
  const didFinish = status?.didJustFinish ?? false;

  // Advance to the next chunk when the current one ends (or stop at the end).
  useEffect(() => {
    if (!didFinish) return;
    if (index < chunks.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setWantPlay(false);
      setIndex(0);
    }
  }, [didFinish, index, chunks.length]);

  // When the active chunk changes while we intend to play, start it.
  useEffect(() => {
    if (wantPlay) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, wantPlay]);

  const priorDuration = chunks.slice(0, index).reduce((s, c) => s + c.duration, 0);
  const totalDuration = chunks.reduce((s, c) => s + c.duration, 0);
  const currentTime = priorDuration + (status?.currentTime ?? 0);
  const playing = status?.playing ?? false;

  const onToggle = () => {
    if (playing) {
      player.pause();
      setWantPlay(false);
    } else {
      setWantPlay(true);
      player.play();
    }
  };

  return (
    <View style={[styles.bar, { backgroundColor: palette.backgroundElement }]}>
      <Pressable onPress={onToggle} hitSlop={8} style={styles.btn}>
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={palette.text} />
      </Pressable>
      <Text style={[styles.time, { color: palette.textSecondary }]}>
        {formatTimestamp(currentTime)} / {formatTimestamp(totalDuration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 12, padding: Spacing.two },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 14, fontVariant: ['tabular-nums'] },
});
