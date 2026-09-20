/**
 * Shared UI kit for the redesign (HANDOFF.md §4). Every primitive reads colours from `useTheme()`.
 */
import { type ReactNode, useEffect, useState } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from './icons';
import { Layout } from './tokens';
import { Type } from './typography';
import { useTheme } from './useTheme';

// ───────────────────────── Motion ─────────────────────────

/** "Rise" entrance: opacity 0→1, translateY 10→0, 0.5 s, staggered by `index` (60 ms). First appearance only. */
export function Rise({ index = 0, step = 60, children, style, ...rest }: ViewProps & { index?: number; step?: number }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <Animated.View
      entering={FadeInDown.duration(500)
        .delay(index * step)
        .easing(Easing.bezier(0.2, 0.7, 0.2, 1).factory())}
      style={style}
      {...rest}>
      {children}
    </Animated.View>
  );
}

/** 8-pt record dot pulsing opacity 1 → .3 over 1.6 s, with its label. */
export function LiveIndicator({ label, size = 8, textStyle }: { label: string; size?: number; textStyle?: TextStyle }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    opacity.value = withRepeat(withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity, reduce]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.liveRow}>
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.record }, dotStyle]} />
      <Text style={[Type.metaStrong, { color: t.record }, textStyle]}>{label}</Text>
    </View>
  );
}

/** Three tiny bars bouncing (scaleY .4↔1) — "processing" state. */
export function ProcessingBars({ color, height = 12, width = 3, gap = 2 }: { color: string; height?: number; width?: number; gap?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap, height }}>
      {[0, 1, 2].map((i) => (
        <Bar key={i} color={color} height={height} width={width} delay={i * 200} />
      ))}
    </View>
  );
}

function Bar({ color, height, width, delay }: { color: string; height: number; width: number; delay: number }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(0.4);
  useEffect(() => {
    if (reduce) {
      scale.value = 0.7;
      return;
    }
    scale.value = withDelay(delay, withRepeat(withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [scale, delay, reduce]);
  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return <Animated.View style={[{ width, height, borderRadius: width / 2, backgroundColor: color }, st]} />;
}

/** Pulse ring around the record button: scale 1→1.6, opacity .45→0, 2.2 s loop. */
export function PulseRing({ size, color }: { size: number; color: string }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.ease) }), -1, false);
  }, [p, reduce]);
  const st = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.6 * p.value }],
    opacity: 0.45 * (1 - p.value),
  }));
  if (reduce) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, st]}
    />
  );
}

// ───────────────────────── Surfaces ─────────────────────────

export function Card({ style, children, padded = true, ...rest }: ViewProps & { padded?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: Layout.cardRadius },
        padded && { padding: 16 },
        t.shadows.card,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

/** Grouped card: children are rows separated by 1-pt lines (Settings groups). */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surface, borderColor: t.line, borderWidth: 1, borderRadius: Layout.cardRadius, overflow: 'hidden' }, style]}>
      {children}
    </View>
  );
}

export function SectionLabel({ children, style, right }: { children: ReactNode; style?: StyleProp<ViewStyle>; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.sectionLabelRow, style]}>
      <Text style={[Type.sectionLabel, { color: t.text2 }]}>{children}</Text>
      {right}
    </View>
  );
}

/** Tiny dot separator for meta rows. */
export function Dot({ size = 3 }: { size?: number }) {
  const t = useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.dot }} />;
}

/** Amber context chip. */
export function Chip({ label, onPress, chevron, size = 'sm' }: { label: string; onPress?: () => void; chevron?: boolean; size?: 'sm' | 'md' }) {
  const t = useTheme();
  const md = size === 'md';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: t.accentTint, height: md ? 36 : 24, paddingHorizontal: md ? 14 : 10, borderRadius: md ? 18 : 12 },
      ]}>
      <Text style={[md ? Type.metaStrong : Type.captionStrong, { color: t.accentText }]} numberOfLines={1}>
        {label}
      </Text>
      {chevron ? <Icon name="chevronDown" size={14} color={t.accentText} /> : null}
    </Pressable>
  );
}

/** Neutral term chip (`surface2`). */
export function TermChip({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.surface2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Text style={[Type.captionStrong, { color: t.text }]}>{label}</Text>
    </View>
  );
}

// ───────────────────────── Controls ─────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  height = 48,
  icon,
  iconColor,
  style,
  disabled,
  flex,
  textStyle,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  height?: number;
  icon?: IconName;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  flex?: number;
  textStyle?: TextStyle;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primaryBtn : variant === 'secondary' ? t.surface : 'transparent';
  const fg = variant === 'primary' ? t.onPrimaryBtn : variant === 'destructive' ? t.destructive : t.text;
  const labelStyle = height >= 60 ? Type.button : height >= 44 ? Type.buttonSmall : Type.buttonMini;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: t.line,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          flex,
        },
        variant === 'primary' && height >= 60 ? t.shadows.float : null,
        style,
      ]}>
      {icon ? <Icon name={icon} size={18} color={iconColor ?? fg} /> : null}
      <Text style={[labelStyle, { color: fg }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  size = 44,
  iconSize = 22,
  color,
  background,
  accessibilityLabel,
  style,
  strokeWidth,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  background?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  strokeWidth?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: background, opacity: pressed ? 0.7 : 1 },
        style,
      ]}>
      <Icon name={name} size={iconSize} color={color ?? t.text} strokeWidth={strokeWidth} />
    </Pressable>
  );
}

export function Input({ style, height = Layout.inputHeight, focusedBorder = true, ...rest }: TextInputProps & { height?: number; focusedBorder?: boolean }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={t.text3}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      style={[
        Type.input,
        {
          height: rest.multiline ? undefined : height,
          minHeight: rest.multiline ? height : undefined,
          paddingHorizontal: 16,
          paddingVertical: rest.multiline ? 14 : 0,
          borderRadius: Layout.inputRadius,
          backgroundColor: t.surface,
          borderWidth: focused && focusedBorder ? 1.5 : 1,
          borderColor: focused && focusedBorder ? t.accent : t.line,
          color: t.text,
          textAlignVertical: rest.multiline ? 'top' : 'center',
        },
        style,
      ]}
    />
  );
}

/** Search field: 46 tall with a magnifier. */
export function SearchField({ value, onChangeText, placeholder, height = 46 }: { value: string; onChangeText: (v: string) => void; placeholder: string; height?: number }) {
  const t = useTheme();
  return (
    <View style={[styles.search, { height, backgroundColor: t.surface, borderColor: t.line, borderRadius: height > 42 ? 14 : 12 }]}>
      <Icon name="search" size={height > 42 ? 18 : 16} color={t.text2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.text3}
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={[height > 42 ? Type.input15 : Type.segment, { flex: 1, color: t.text, paddingVertical: 0 }]}
      />
    </View>
  );
}

/** Segmented control: 40 tall, 3-pt padding, sliding selected pill (0.25 s spring). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const reduce = useReducedMotion();
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = width > 0 ? (width - 6) / options.length : 0;
  const x = useSharedValue(0);
  useEffect(() => {
    const target = index * segW;
    x.value = reduce ? target : withSpring(target, { damping: 20, stiffness: 260, mass: 0.6 });
  }, [index, segW, x, reduce]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const selectedBg = t.scheme === 'light' ? t.surface : t.line;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.segmented, { backgroundColor: t.surface2 }, style]}
      accessibilityRole="tablist">
      {segW > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 3, left: 3, width: segW, height: 34, borderRadius: 9, backgroundColor: selectedBg }, t.shadows.segment, pill]}
        />
      ) : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.segment}>
            <Text style={[selected ? Type.segmentActive : Type.segment, { color: selected ? t.text : t.text2 }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Settings-style row: title (+ subtitle) left, value/chevron right, 1-pt divider. */
export function Row({
  title,
  subtitle,
  value,
  right,
  onPress,
  chevron,
  last,
  titleStyle,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
  titleStyle?: TextStyle;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { borderBottomColor: t.line, borderBottomWidth: last ? 0 : 1, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[Type.body, { fontSize: 16, lineHeight: 20 }, { color: t.text }, titleStyle]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Type.meta, { color: t.text2 }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={[Type.input15, { color: t.text2 }]}>{value}</Text> : null}
      {right}
      {chevron ? <Icon name="chevronRight" size={value ? 16 : 18} color={value ? t.text2 : t.text3} /> : null}
    </Pressable>
  );
}

/** Amber info callout. */
export function Callout({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.callout, { backgroundColor: t.accentTint }]}>
      <Icon name="info" size={18} color={t.accentText} />
      <Text style={[Type.meta, { flex: 1, lineHeight: 19, color: t.scheme === 'light' ? '#5C4A2A' : t.text2 }]}>{children}</Text>
    </View>
  );
}

/** Static waveform bars (played = accent, unplayed = waveIdle). `heights` are 0..1. */
export function Waveform({
  heights,
  progress = 0,
  height,
  barWidth = 3,
  gap = 3,
  style,
  playedColor,
  idleColor,
}: {
  heights: number[];
  progress?: number;
  height: number;
  barWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  playedColor?: string;
  idleColor?: string;
}) {
  const t = useTheme();
  const played = Math.round(heights.length * Math.min(1, Math.max(0, progress)));
  return (
    <View style={[{ height, flexDirection: 'row', alignItems: 'center', gap }, style]} pointerEvents="none">
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            width: barWidth,
            height: Math.max(barWidth, Math.round(h * height)),
            borderRadius: barWidth / 2,
            backgroundColor: i < played ? (playedColor ?? t.accent) : (idleColor ?? t.waveIdle),
          }}
        />
      ))}
    </View>
  );
}

/** Deterministic pseudo-random waveform silhouette for a recording (seeded by id) — until real levels exist. */
export function waveformFor(seed: string, bars: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const out: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const r = ((h >>> 0) % 1000) / 1000;
    const envelope = 0.35 + 0.65 * Math.sin((i / bars) * Math.PI * 2.3 + r);
    out.push(0.12 + 0.85 * Math.abs(envelope) * (0.5 + 0.5 * r));
  }
  return out;
}

/** Thin 3-pt progress bar. */
export function ProgressBar({ progress, indeterminate }: { progress: number; indeterminate?: boolean }) {
  const t = useTheme();
  const reduce = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!indeterminate || reduce) return;
    x.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
  }, [indeterminate, reduce, x]);
  const shimmer = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + 320 * x.value }] }));
  return (
    <View style={{ height: 3, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round((indeterminate ? 1 : progress) * 100)}%`, height: 3, borderRadius: 2, backgroundColor: t.accent, overflow: 'hidden' }}>
        {indeterminate && !reduce ? (
          <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 160, backgroundColor: 'rgba(255,255,255,0.45)' }, shimmer]} />
        ) : null}
      </View>
    </View>
  );
}

/** Round icon tile used by built-in context rows. */
export function IconTile({ name, size = 40 }: { name: IconName; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: t.accentTint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={20} color={t.accentText} />
    </View>
  );
}

const styles = StyleSheet.create({
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1 },
  segmented: { height: 40, padding: 3, borderRadius: 12, flexDirection: 'row', position: 'relative' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  callout: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 14 },
});
