/**
 * Live Activity shown on the Lock Screen and in the Dynamic Island while a recording is being
 * processed after it stops — transcription (with a % progress bar) and then recap generation
 * (an indeterminate spinner, since the LLM gives no incremental progress). This is the crucial
 * "the app is still working" signal for long recordings, where processing continues while the
 * user is away from the screen (Product Plan §7.2 — background progress).
 *
 * Same generic Live Activity plumbing as RecordingActivity: expo-widgets renders the SwiftUI JSX
 * below natively, keyed by the activity name. The native extension needs no rebuild to learn about
 * this second activity type — the layout is registered at runtime the first time `.start()` runs.
 *
 * Rules of the `'widget'` runtime: no hooks/state, no module-scope references, only
 * `@expo/ui/swift-ui` components. Props cross the bridge as JSON.
 */
// The widget body is serialized into WidgetKit's isolated JS runtime, which has no React — the React
// Compiler must not memoize anything here (it would inject `_c` from react/compiler-runtime).
'use no memo';

import { HStack, Image, ProgressView, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  padding,
  progressViewStyle,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type ProcessingActivityProps = {
  /** Which stage the coordinator is in. */
  phase: 'transcribing' | 'summarizing';
  /** Progress fraction 0..1 (transcription only; ignored while indeterminate). */
  value: number;
  /** True when we have a real fraction to show (transcribing with a known chunk count). */
  determinate: boolean;
  /** Recap title (or a generic fallback) shown on the Lock Screen banner. */
  title: string;
  /** Localized status text: "Transcribing…" / "Creating recap…". */
  statusLabel: string;
  /** Localized app name shown in the expanded island. */
  appName: string;
  /** Pre-formatted percentage ("63%") — empty string while indeterminate. */
  percentLabel: string;
};

const ProcessingActivity = (props: ProcessingActivityProps, _env: LiveActivityEnvironment) => {
  'widget';
  const AMBER = '#E9A24A';
  const GREY = '#FFFFFF99';
  const WHITE = '#FFFFFF';
  const icon = props.phase === 'summarizing' ? 'sparkles' : 'waveform';

  // The progress bar: a determinate linear fill while transcribing (we push a snapshot per chunk),
  // an indeterminate track while the recap is generating (the LLM gives us no partial progress).
  const Bar = ({ width }: { width: number }) =>
    props.determinate ? (
      <ProgressView
        value={props.value}
        modifiers={[progressViewStyle('linear'), tint(AMBER), frame({ width })]}
      />
    ) : (
      <ProgressView modifiers={[progressViewStyle('linear'), tint(AMBER), frame({ width })]} />
    );

  // Compact trailing / minimal indicator: the % when we have one, otherwise a tiny spinner.
  const Pip = () =>
    props.determinate && props.percentLabel ? (
      <Text
        modifiers={[
          font({ weight: 'semibold', size: 13 }),
          monospacedDigit(),
          foregroundStyle(WHITE),
          frame({ width: 40, alignment: 'trailing' }),
        ]}>
        {props.percentLabel}
      </Text>
    ) : (
      <ProgressView modifiers={[progressViewStyle('circular'), tint(AMBER)]} />
    );

  return {
    // Lock Screen / Notification Center banner.
    banner: (
      <ZStack modifiers={[containerBackground('#15171B', 'widget'), clipShape('containerRelativeShape')]}>
        <VStack alignment="leading" spacing={10} modifiers={[frame({ maxWidth: Infinity }), padding({ all: 16 })]}>
          <HStack spacing={12}>
            <Image systemName={icon} size={26} color={AMBER} />
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ weight: 'semibold', size: 16 }), foregroundStyle(WHITE)]}>
                {props.statusLabel}
              </Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(GREY)]}>{props.title}</Text>
            </VStack>
            <Spacer />
            {props.determinate && props.percentLabel ? (
              <Text
                modifiers={[
                  font({ weight: 'semibold', size: 22 }),
                  monospacedDigit(),
                  foregroundStyle(WHITE),
                ]}>
                {props.percentLabel}
              </Text>
            ) : (
              <ProgressView modifiers={[progressViewStyle('circular'), tint(AMBER)]} />
            )}
          </HStack>
          <Bar width={Infinity} />
        </VStack>
      </ZStack>
    ),
    // Dynamic Island — compact: icon on the left, % (or spinner) on the right.
    compactLeading: <Image systemName={icon} size={14} color={AMBER} modifiers={[padding({ leading: 4 })]} />,
    compactTrailing: <Pip />,
    // Smallest form — just the icon.
    minimal: <Image systemName={icon} size={14} color={AMBER} />,
    // Expanded island.
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 8 })]}>
        <Image systemName={icon} size={16} color={AMBER} />
        <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle(WHITE)]}>{props.appName}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <HStack modifiers={[padding({ trailing: 6 })]}>
        {props.determinate && props.percentLabel ? (
          <Text
            modifiers={[
              font({ weight: 'semibold', size: 16 }),
              monospacedDigit(),
              foregroundStyle(WHITE),
              frame({ width: 56, alignment: 'trailing' }),
            ]}>
            {props.percentLabel}
          </Text>
        ) : (
          <ProgressView modifiers={[progressViewStyle('circular'), tint(AMBER)]} />
        )}
      </HStack>
    ),
    expandedBottom: (
      <VStack alignment="leading" spacing={6} modifiers={[padding({ top: 4, horizontal: 8 })]}>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(GREY)]}>{props.statusLabel}</Text>
        <Bar width={Infinity} />
      </VStack>
    ),
  };
};

export default createLiveActivity<ProcessingActivityProps>('ProcessingActivity', ProcessingActivity);
