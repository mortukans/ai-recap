/**
 * Live microphone waveform + halo for the recording screen. Driven by the recorder's `level` events
 * (0…1, ~12 Hz). The newest sample sits in the middle and older ones fan out to both sides; bars fade
 * toward the edges. The halo swells with the voice on top of a slow breathing cycle.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from './useTheme';

const BARS = 44;
const HALF = BARS / 2;

/** Perceptual shaping: emphasise the speech range, keep a small floor so silence still breathes. */
function shape(level: number): number {
  return Math.max(0.05, Math.pow(Math.min(1, Math.max(0, level)), 0.7));
}

export function LiveWaveform({
  level,
  active,
  width = 350,
  height = 120,
  barWidth = 4,
  gap = 4,
}: {
  level: number;
  active: boolean;
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const historyRef = useRef<number[]>(Array.from({ length: HALF }, () => 0.05));
  const [history, setHistory] = useState(historyRef.current);
  const idle = useSharedValue(0);

  useEffect(() => {
    const next = [active ? shape(level) : 0.05, ...historyRef.current.slice(0, HALF - 1)];
    historyRef.current = next;
    setHistory(next);
  }, [level, active]);

  // Idle shimmer while paused / before the first sample.
  useEffect(() => {
    if (reduce) return;
    idle.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [idle, reduce]);

  return (
    <View style={[styles.wave, { width, height, gap }]} pointerEvents="none">
      {Array.from({ length: BARS }, (_, i) => {
        const idx = Math.abs(i - HALF);
        const v = history[Math.min(idx, HALF - 1)] ?? 0.05;
        const alpha = 0.3 + 0.7 * (1 - idx / (HALF + 4));
        return <Bar key={i} value={v} alpha={alpha} height={height} width={barWidth} color={t.accent} idle={idle} active={active} reduce={reduce} />;
      })}
    </View>
  );
}

function Bar({
  value,
  alpha,
  height,
  width,
  color,
  idle,
  active,
  reduce,
}: {
  value: number;
  alpha: number;
  height: number;
  width: number;
  color: string;
  idle: SharedValue<number>;
  active: boolean;
  reduce: boolean;
}) {
  const h = useSharedValue(height * 0.05);
  useEffect(() => {
    const target = Math.max(width, height * value);
    h.value = reduce ? target : withTiming(target, { duration: 90, easing: Easing.out(Easing.quad) });
  }, [value, height, width, h, reduce]);
  const st = useAnimatedStyle(() => ({
    height: h.value + (active ? 0 : idle.value * 4),
    opacity: alpha,
  }));
  return <Animated.View style={[{ width, borderRadius: width / 2, backgroundColor: color }, st]} />;
}

/** Amber halo: radial gradient that breathes slowly and swells with the input level. */
export function VoiceHalo({ level, active, size = 360 }: { level: number; active: boolean; size?: number }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const breathe = useSharedValue(0);
  const voice = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    breathe.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathe, reduce]);

  useEffect(() => {
    voice.value = withTiming(active ? shape(level) : 0, { duration: active ? 140 : 600, easing: Easing.out(Easing.quad) });
  }, [level, active, voice]);

  const outer = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + 0.1 * breathe.value + 0.35 * voice.value }],
    opacity: 0.55 + 0.25 * breathe.value + 0.3 * voice.value,
  }));
  const inner = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + 0.08 * (1 - breathe.value) + 0.5 * voice.value }],
    opacity: 0.35 + 0.65 * voice.value,
  }));

  const amber = t.accent;
  return (
    <View pointerEvents="none" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, outer]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="halo-outer" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={amber} stopOpacity={t.scheme === 'light' ? 0.28 : 0.34} />
              <Stop offset="0.55" stopColor={amber} stopOpacity={0.1} />
              <Stop offset="1" stopColor={amber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo-outer)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, inner]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="halo-inner" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6CE8E" stopOpacity={0.35} />
              <Stop offset="0.5" stopColor={amber} stopOpacity={0.12} />
              <Stop offset="1" stopColor={amber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo-inner)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
