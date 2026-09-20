/**
 * Thin wrapper over lottie-react-native. The native module is loaded lazily so a dev client built
 * before it was added keeps working (the animation simply renders nothing), and Reduce Motion shows
 * the final frame instead of looping.
 */
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export type LottieName = 'logo-mark' | 'record-pulse' | 'waveform-live' | 'check-draw' | 'processing-bars' | 'halo-breathe';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SOURCES: Record<LottieName, unknown> = {
  'logo-mark': require('../../assets/lottie/logo-mark.json'),
  'record-pulse': require('../../assets/lottie/record-pulse.json'),
  'waveform-live': require('../../assets/lottie/waveform-live.json'),
  'check-draw': require('../../assets/lottie/check-draw.json'),
  'processing-bars': require('../../assets/lottie/processing-bars.json'),
  'halo-breathe': require('../../assets/lottie/halo-breathe.json'),
};

type LottieProps = {
  source: unknown;
  autoPlay?: boolean;
  loop?: boolean;
  progress?: number;
  speed?: number;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain' | 'center';
};

let Native: ComponentType<LottieProps> | null | undefined;
function nativeView(): ComponentType<LottieProps> | null {
  if (Native !== undefined) return Native;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Native = (require('lottie-react-native') as { default: ComponentType<LottieProps> }).default;
  } catch {
    Native = null;
  }
  return Native;
}

export function Lottie({
  name,
  loop = true,
  style,
  speed = 1,
  play = true,
}: {
  name: LottieName;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  speed?: number;
  /** When false the animation is frozen on its final frame. */
  play?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const View = nativeView();
  if (!View) return null;
  const still = reduceMotion || !play;
  return (
    <View
      source={SOURCES[name]}
      autoPlay={!still}
      loop={loop && !still}
      progress={still ? 1 : undefined}
      speed={speed}
      style={style}
      resizeMode="contain"
    />
  );
}
