import { useColorScheme } from 'react-native';

import { DARK, LIGHT, type Theme } from './tokens';

/** Current theme (light is the default appearance; dark follows the system `.dark` scheme). */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}

export function themeFor(scheme: 'light' | 'dark' | null | undefined): Theme {
  return scheme === 'dark' ? DARK : LIGHT;
}
