/**
 * Sequential playback across a recap's audio chunks (M1-9) in two skins (HANDOFF.md §5.3 / §5.4):
 *  - `card`: 44-pt play button + waveform scrubber + times row (recap detail)
 *  - `bar`:  48-pt play button + 3-pt progress + times (transcript floating player)
 * `seekRequest` jumps to a transcript timestamp; `onTime` reports the absolute playhead (~4×/s).
 */
import { formatTimestamp, locateInChunks } from '@ai-recap/core';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { type GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import { Card, IconButton, Waveform, waveformFor } from '../../design/components';
import { Type } from '../../design/typography';
import { useTheme } from '../../design/useTheme';

export interface PlayChunk {
  uri: string;
  duration: number;
}

export interface SeekRequest {
  seconds: number;
  nonce: number;
}

const WAVE_BARS = 52;

export function RecordingPlayer({
  chunks,
  seed,
  variant = 'card',
  seekRequest = null,
  onTime,
}: {
  chunks: PlayChunk[];
  /** Stable id used to draw a deterministic waveform silhouette (recap id). */
  seed: string;
  variant?: 'card' | 'bar';
  seekRequest?: SeekRequest | null;
  onTime?: (seconds: number, playing: boolean) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [index, setIndex] = useState(0);
  const [wantPlay, setWantPlay] = useState(false);
  const [pending, setPending] = useState<{ index: number; offset: number } | null>(null);
  const [waveWidth, setWaveWidth] = useState(0);
  const current = chunks[index];
  const player = useAudioPlayer(current ? { uri: current.uri } : null);
  const status = useAudioPlayerStatus(player);
  const didFinish = status?.didJustFinish ?? false;
  const isLoaded = status?.isLoaded ?? false;

  const durations = chunks.map((ch) => ch.duration);
  const totalDuration = durations.reduce((s, d) => s + d, 0);
  const priorDuration = durations.slice(0, index).reduce((s, d) => s + d, 0);
  const currentTime = priorDuration + (status?.currentTime ?? 0);
  const playing = status?.playing ?? false;
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  const seekAbsolute = (seconds: number) => {
    if (chunks.length === 0) return;
    const { index: target, offset } = locateInChunks(durations, seconds);
    setWantPlay(true);
    if (target === index) {
      void player.seekTo(offset).then(() => player.play());
    } else {
      setPending({ index: target, offset });
      setIndex(target);
    }
  };

  useEffect(() => {
    if (seekRequest) seekAbsolute(seekRequest.seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.nonce]);

  const loadedDuration = status?.duration ?? 0;
  useEffect(() => {
    if (!pending || pending.index !== index || !isLoaded || loadedDuration <= 0) return;
    const { offset } = pending;
    setPending(null);
    void player
      .seekTo(offset)
      .then(() => player.play())
      .catch(() => player.play());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, loadedDuration, pending, index]);

  useEffect(() => {
    if (!didFinish) return;
    if (index < chunks.length - 1) setIndex((i) => i + 1);
    else {
      setWantPlay(false);
      setIndex(0);
    }
  }, [didFinish, index, chunks.length]);

  useEffect(() => {
    if (wantPlay && pending === null) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, wantPlay]);

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

  const onScrub = (e: GestureResponderEvent) => {
    if (waveWidth <= 0 || totalDuration <= 0) return;
    const ratio = Math.min(1, Math.max(0, e.nativeEvent.locationX / waveWidth));
    seekAbsolute(ratio * totalDuration);
  };

  const times = (
    <View style={styles.times}>
      <Text style={[Type.captionStrong, styles.tabular, { color: t.text }]}>{formatTimestamp(currentTime)}</Text>
      {variant === 'card' ? <Text style={[Type.caption, { color: t.text2 }]}>1×</Text> : null}
      <Text style={[Type.caption, styles.tabular, { color: t.text2 }]}>{formatTimestamp(totalDuration)}</Text>
    </View>
  );

  if (variant === 'bar') {
    return (
      <View style={styles.bar}>
        <IconButton
          name={playing ? 'pause' : 'play'}
          accessibilityLabel={playing ? tr('recording.pause') : tr('ui.play')}
          onPress={onToggle}
          size={48}
          iconSize={18}
          background={t.primaryBtn}
          color={t.onPrimaryBtn}
          style={t.shadows.float}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Pressable onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)} onPress={onScrub} hitSlop={{ top: 12, bottom: 12 }}>
            <View style={{ height: 3, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(progress * 100)}%`, height: 3, borderRadius: 2, backgroundColor: t.accent }} />
            </View>
          </Pressable>
          {times}
        </View>
      </View>
    );
  }

  return (
    <Card style={{ gap: 10, paddingVertical: 14 }}>
      <View style={styles.row}>
        <IconButton
          name={playing ? 'pause' : 'play'}
          accessibilityLabel={playing ? tr('recording.pause') : tr('ui.play')}
          onPress={onToggle}
          size={44}
          iconSize={18}
          background={t.primaryBtn}
          color={t.onPrimaryBtn}
        />
        <Pressable style={{ flex: 1, height: 44, justifyContent: 'center' }} onLayout={(e) => setWaveWidth(e.nativeEvent.layout.width)} onPress={onScrub}>
          <Waveform heights={waveformFor(seed, WAVE_BARS)} progress={progress} height={38} barWidth={3} gap={3} style={{ justifyContent: 'space-between' }} />
        </Pressable>
      </View>
      {times}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
