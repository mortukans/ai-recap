/**
 * Type scale (HANDOFF.md §3). Newsreader for display, Hanken Grotesk for everything else.
 * Font family names must match what `useAppFonts()` registers.
 */
import type { TextStyle } from 'react-native';

export const FontFamily = {
  displayLight: 'Newsreader_300Light',
  display: 'Newsreader_400Regular',
  displayMedium: 'Newsreader_500Medium',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemibold: 'HankenGrotesk_600SemiBold',
} as const;

/** Newsreader at a given weight. */
export function display(size: number, weight: 300 | 400 | 500 = 400, lineHeight?: number): TextStyle {
  const family = weight === 300 ? FontFamily.displayLight : weight === 500 ? FontFamily.displayMedium : FontFamily.display;
  return { fontFamily: family, fontSize: size, lineHeight: lineHeight ?? Math.round(size * 1.1) };
}

/** Hanken Grotesk at a given weight. */
export function sans(size: number, weight: 400 | 500 | 600 = 400, lineHeight?: number): TextStyle {
  const family = weight === 600 ? FontFamily.sansSemibold : weight === 500 ? FontFamily.sansMedium : FontFamily.sans;
  return { fontFamily: family, fontSize: size, lineHeight: lineHeight ?? Math.round(size * 1.35) };
}

export const Type = {
  screenTitle: { ...display(40, 500, 40), letterSpacing: -0.8 } as TextStyle,
  detailTitle: { ...display(30, 500, 34), letterSpacing: -0.45 } as TextStyle,
  formTitle: { ...display(34, 500, 36), letterSpacing: -0.68 } as TextStyle,
  timer: { ...display(104, 300, 104), letterSpacing: -3, fontVariant: ['tabular-nums'] } as TextStyle,
  summaryLead: display(20, 400, 28),
  heroNumber: display(24, 400, 24),
  tileNumber: display(26, 400, 26),
  body: sans(17, 500, 22),
  bodyText: sans(16, 400, 24),
  bodyText15: sans(15, 400, 21),
  meta: sans(13, 400, 17),
  metaStrong: sans(13, 600, 17),
  caption: sans(12, 400, 16),
  captionStrong: sans(12, 600, 16),
  sectionLabel: sans(13, 600, 17),
  tabLabel: sans(11, 600, 13),
  button: sans(17, 600, 20),
  buttonSmall: sans(15, 600, 18),
  buttonMini: sans(14, 600, 17),
  segment: sans(14, 500, 17),
  segmentActive: sans(14, 600, 17),
  input: sans(17, 400, 22),
  input15: sans(15, 400, 20),
} as const;
