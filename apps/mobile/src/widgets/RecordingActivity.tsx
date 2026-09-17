/**
 * Live Activity shown on the Lock Screen and in the Dynamic Island while a recording is in progress
 * (MVP task M6-1, Product Plan §7.2). Rendered natively by expo-widgets from the SwiftUI JSX below.
 *
 * Rules of the `'widget'` runtime: no hooks/state, no module-scope references, only `@expo/ui/swift-ui`
 * components. Props cross the bridge as JSON, so dates travel as epoch milliseconds. The elapsed timer
 * counts up on its own via SwiftUI `timerInterval`; the app only pushes a snapshot on pause/resume/finish.
 */
import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  clipShape,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  multilineTextAlignment,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

export type RecordingActivityProps = {
  /** When recording started (epoch ms) — the timer counts up from here. */
  startEpochMs: number;
  /** Upper bound for the timer (epoch ms), e.g. the plan's recording cap. */
  endEpochMs: number;
  /** Paused recordings show a frozen `elapsedLabel` instead of the live timer. */
  paused: boolean;
  /** Pre-formatted elapsed time (mm:ss) used while paused. */
  elapsedLabel: string;
  /** Localized status text: "Recording" / "Paused". */
  statusLabel: string;
  /** Localized app name shown in the expanded island. */
  appName: string;
};

const RecordingActivity = (props: RecordingActivityProps, _env: LiveActivityEnvironment) => {
  'widget';
  const RED = '#E5484D';
  const GREY = '#FFFFFF99';
  const WHITE = '#FFFFFF';
  const startDate = new Date(props.startEpochMs);
  const endDate = new Date(props.endEpochMs);
  const icon = props.paused ? 'pause.circle.fill' : 'mic.fill';
  const iconColor = props.paused ? GREY : RED;

  // Elapsed time — live while recording, frozen label while paused. Timer text is greedy, so a fixed
  // width + monospaced digits keep it from pushing neighbours around.
  const Elapsed = ({ size, width, color }: { size: number; width: number; color: string }) =>
    props.paused ? (
      <Text
        modifiers={[
          font({ weight: 'semibold', size }),
          monospacedDigit(),
          foregroundStyle(color),
          multilineTextAlignment('trailing'),
          frame({ width, alignment: 'trailing' }),
        ]}>
        {props.elapsedLabel}
      </Text>
    ) : (
      <Text
        timerInterval={{ lower: startDate, upper: endDate }}
        countsDown={false}
        modifiers={[
          font({ weight: 'semibold', size }),
          monospacedDigit(),
          foregroundStyle(color),
          multilineTextAlignment('trailing'),
          frame({ width, alignment: 'trailing' }),
        ]}
      />
    );

  return {
    // Lock Screen / Notification Center banner.
    banner: (
      <ZStack modifiers={[containerBackground('#101418', 'widget'), clipShape('containerRelativeShape')]}>
        <HStack spacing={12} modifiers={[frame({ maxWidth: Infinity }), padding({ all: 16 })]}>
          <Image systemName={icon} size={28} color={iconColor} />
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ weight: 'semibold', size: 16 }), foregroundStyle(WHITE)]}>
              {props.statusLabel}
            </Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(GREY)]}>{props.appName}</Text>
          </VStack>
          <Spacer />
          <Elapsed size={28} width={96} color={WHITE} />
        </HStack>
      </ZStack>
    ),
    // Dynamic Island — compact: mic on the left, elapsed on the right.
    compactLeading: <Image systemName={icon} size={14} color={iconColor} modifiers={[padding({ leading: 4 })]} />,
    compactTrailing: <Elapsed size={13} width={46} color={WHITE} />,
    // Smallest form — just the mic.
    minimal: <Image systemName={icon} size={14} color={iconColor} />,
    // Expanded island.
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 8 })]}>
        <Image systemName={icon} size={16} color={iconColor} />
        <Text modifiers={[font({ weight: 'semibold', size: 14 }), foregroundStyle(WHITE)]}>{props.appName}</Text>
      </HStack>
    ),
    expandedTrailing: (
      <HStack modifiers={[padding({ trailing: 6 })]}>
        <Elapsed size={16} width={64} color={WHITE} />
      </HStack>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 13 }), foregroundStyle(GREY), padding({ top: 4, horizontal: 8 })]}>
        {props.statusLabel}
      </Text>
    ),
  };
};

export default createLiveActivity<RecordingActivityProps>('RecordingActivity', RecordingActivity);
