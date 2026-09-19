import { formatTimestamp, locateInChunks } from '@ai-recap/core';
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

/** A request to jump to an absolute position (seconds across all chunks); `nonce` makes repeats distinct. */
export interface SeekRequest {
  seconds: number;
  nonce: number;
}

/**
 * Sequential playback across a recap's audio chunks (M1-9). Advances to the next chunk on finish.
 * `seekRequest` jumps to a transcript timestamp; `onTime` reports the absolute playhead (~4x/s).
 */
export function RecordingPlayer({
  chunks,
  palette,
  seekRequest = null,
  onTime,
}: {
  chunks: PlayChunk[];
  palette: Palette;
  seekRequest?: SeekRequest | null;
  onTime?: (seconds: number, playing: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [wantPlay, setWantPlay] = useState(false);
  const [pendingOffset, setPendingOffset] = useState<number | null>(null);
  const current = chunks[index];
  const player = useAudioPlayer(current ? { uri: current.uri } : null);
  const status = useAudioPlayerStatus(player);
  const didFinish = status?.didJustFinish ?? false;
  const isLoaded = status?.isLoaded ?? false;

  // Absolute seconds -> (chunk, offset). Chunks are ordered and contiguous.
  useEffect(() => {
    if (!seekRequest || chunks.length === 0) return;
    const { index: target, offset } = locateInChunks(
      chunks.map((ch) => ch.duration),
      seekRequest.seconds,
    );
    setWantPlay(true);
    if (target === index) {
      // Same chunk: seek right away (the "loaded" effect below only fires on chunk changes).
      void player.seekTo(offset).then(() => player.play());
    } else {
      setPendingOffset(offset);
      setIndex(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.nonce]);

  // Apply a pending offset once the newly selected chunk has loaded.
  useEffect(() => {
    if (!isLoaded || pendingOffset === null) return;
    const offset = pendingOffset;
    setPendingOffset(null);
    void player.seekTo(offset).then(() => player.play());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, pendingOffset, index]);

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
    if (wantPlay && pendingOffset === null) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, wantPlay]);

  const priorDuration = chunks.slice(0, index).reduce((s, c) => s + c.duration, 0);
  const totalDuration = chunks.reduce((s, c) => s + c.duration, 0);
  const currentTime = priorDuration + (status?.currentTime ?? 0);
  const playing = status?.playing ?? false;

  useEffect(() => {
    onTime?.(currentTime, playing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(currentTime * 4), playing]);

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
