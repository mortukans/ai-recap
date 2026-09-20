/**
 * Legacy palette shim. Screens not yet migrated to `src/design` read `Colors[scheme]`; these now map
 * onto the redesign tokens so the whole app shares one palette. New code should use `useTheme()`.
 */
import { Platform } from 'react-native';

import { DARK, LIGHT } from '../design/tokens';

export const Colors = {
  light: {
    text: LIGHT.text,
    background: LIGHT.bg,
    backgroundElement: LIGHT.surface,
    backgroundSelected: LIGHT.surface2,
    textSecondary: LIGHT.text2,
  },
  dark: {
    text: DARK.text,
    background: DARK.bg,
    backgroundElement: DARK.surface,
    backgroundSelected: DARK.surface2,
    textSecondary: DARK.text2,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Legacy font aliases kept for the template components under src/components. */
export const Fonts = Platform.select({
  ios: { sans: 'HankenGrotesk_400Regular', serif: 'Newsreader_400Regular', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'HankenGrotesk_400Regular', serif: 'Newsreader_400Regular', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
