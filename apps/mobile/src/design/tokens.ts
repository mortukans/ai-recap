/**
 * Design tokens (design/ai-recap-design-handoff/HANDOFF.md §2–§3). Light = default appearance,
 * dark = `.dark` color scheme. Never hard-code hex in views — go through `useTheme()`.
 */
export interface Theme {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentText: string;
  accentTint: string;
  /** Deeper accent tint (the "breathing" playing-utterance colour, search highlight). */
  accentTint2: string;
  onAccent: string;
  record: string;
  primaryBtn: string;
  onPrimaryBtn: string;
  speaker2: string;
  success: string;
  destructive: string;
  /** Unplayed waveform bars. */
  waveIdle: string;
  /** Tiny dot separators in meta rows. */
  dot: string;
  /** Translucent tab-bar / floating pill fill. */
  glass: string;
  shadows: {
    card: object;
    float: object;
    record: object;
    segment: object;
  };
}

const shadow = (color: string, y: number, blur: number, opacity: number) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowRadius: blur / 2,
  shadowOpacity: opacity,
  elevation: Math.round(y / 2),
});

const NONE = {};

export const LIGHT: Theme = {
  scheme: 'light',
  bg: '#F4F5F7',
  surface: '#FFFFFF',
  surface2: '#EAECF0',
  line: '#E1E4E9',
  text: '#16181D',
  text2: '#656A73',
  text3: '#8A8F98',
  accent: '#E9A24A',
  accentText: '#A8661A',
  accentTint: '#FBEFDC',
  accentTint2: '#F6E2C0',
  onAccent: '#1A1408',
  record: '#E0432F',
  primaryBtn: '#16181D',
  onPrimaryBtn: '#FFFFFF',
  speaker2: '#3A6E9A',
  success: '#2E7D4F',
  destructive: '#C4372A',
  waveIdle: '#D5D9E0',
  dot: '#C9CDD4',
  glass: 'rgba(255,255,255,0.92)',
  shadows: {
    card: shadow('#16181D', 8, 24, 0.06),
    float: shadow('#16181D', 12, 32, 0.12),
    record: shadow('#E0432F', 12, 32, 0.3),
    segment: shadow('#16181D', 2, 6, 0.1),
  },
};

export const DARK: Theme = {
  scheme: 'dark',
  bg: '#15171B',
  surface: '#1D2025',
  surface2: '#262A30',
  line: '#2E333A',
  text: '#F1EDE6',
  text2: '#A6A29B',
  text3: '#86827B',
  accent: '#E9A24A',
  accentText: '#E9A24A',
  accentTint: '#2A2418',
  accentTint2: '#3A2E17',
  onAccent: '#1A1408',
  record: '#F2543F',
  primaryBtn: '#F1EDE6',
  onPrimaryBtn: '#15171B',
  speaker2: '#8FB7D6',
  success: '#7FBF8E',
  destructive: '#F2543F',
  waveIdle: '#3A3F47',
  dot: '#3A3F47',
  glass: 'rgba(29,32,37,0.94)',
  shadows: {
    card: NONE,
    float: shadow('#000000', 12, 32, 0.4),
    record: shadow('#F2543F', 12, 32, 0.3),
    segment: NONE,
  },
};

/** Brand constants that do not change with the theme. */
export const BRAND = {
  amber: '#E9A24A',
  red: '#E0432F',
  ink: '#16181D',
  bone: '#F1EDE6',
  onAmber: '#1A1408',
} as const;

/** Layout constants from the mocks (points). */
export const Layout = {
  screenPadding: 20,
  cardRadius: 18,
  inputHeight: 50,
  inputRadius: 14,
  tabBarHeight: 64,
  tabBarBottom: 30,
  tabBarInset: 16,
  /** Space to leave under scroll content so it clears the floating tab bar. */
  tabBarClearance: 64 + 30 + 24,
} as const;
