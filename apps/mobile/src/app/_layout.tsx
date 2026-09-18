import '../i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useBootstrap } from '../bootstrap/useBootstrap';
import { startWatchBridge } from '../features/recording/watchBridge';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { ready } = useBootstrap();

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
      startWatchBridge(); // Apple Watch remote control (iOS only, no-op elsewhere)
    }
  }, [ready]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="recording" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="recap/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: true }} />
      </Stack>
    </ThemeProvider>
  );
}
