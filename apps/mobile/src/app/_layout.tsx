import i18n, { resolveLanguage } from '../i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useBootstrap } from '../bootstrap/useBootstrap';
import { useAppFonts } from '../design/fonts';
import { FontFamily } from '../design/typography';
import { useTheme } from '../design/useTheme';
import { startWatchBridge } from '../features/recording/watchBridge';
import { getAppLanguage } from '../lib/prefs';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const t = useTheme();
  const { ready } = useBootstrap();
  const fontsReady = useAppFonts();

  useEffect(() => {
    void getAppLanguage().then((choice) => {
      const lang = resolveLanguage(choice);
      if (i18n.language !== lang) void i18n.changeLanguage(lang);
    });
  }, []);

  useEffect(() => {
    if (ready && fontsReady) {
      void SplashScreen.hideAsync();
      startWatchBridge(); // Apple Watch remote control (iOS only, no-op elsewhere)
    }
  }, [ready, fontsReady]);

  // Navigation theme = design tokens, so system-drawn chrome (headers, modals) matches the screens.
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.surface, text: t.text, border: t.line, primary: t.accentText },
    fonts: {
      regular: { fontFamily: FontFamily.sans, fontWeight: '400' as const },
      medium: { fontFamily: FontFamily.sansMedium, fontWeight: '500' as const },
      bold: { fontFamily: FontFamily.sansSemibold, fontWeight: '600' as const },
      heavy: { fontFamily: FontFamily.sansSemibold, fontWeight: '700' as const },
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recording" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="recap/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="transcript/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="context/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
  );
}
