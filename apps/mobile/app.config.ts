import type { ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Identity + native capabilities the app needs:
 *  - iOS `UIBackgroundModes: audio` for locked/background recording (§7.2)
 *  - microphone (+ speech) usage strings
 *  - Android foreground-service-microphone + notifications permissions (§7.3)
 *  - `extra` is populated from environment at build time (no secrets beyond the RLS-safe anon key).
 */
const config: ExpoConfig = {
  name: 'AI Recap',
  slug: 'ai-recap',
  version: '0.0.1',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'airecap',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'lv.airecap.app',
    supportsTablet: false,
    icon: './assets/expo.icon',
    infoPlist: {
      UIBackgroundModes: ['audio'],
      NSMicrophoneUsageDescription:
        'AI Recap records your meetings and conversations so you can transcribe and recap them.',
      NSSpeechRecognitionUsageDescription:
        'AI Recap can transcribe recordings on-device when supported.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'lv.airecap.app',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-audio',
    // Live Activity for in-progress recordings (Lock Screen + Dynamic Island), M6-1. No home-screen
    // widgets yet; the plugin still generates the WidgetKit extension target + NSSupportsLiveActivities.
    ['expo-widgets', { widgets: [] }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
    revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
    // EAS project link (public UUID, set by `eas init`).
    eas: {
      projectId: '77676bfa-f0e5-43f7-8f61-a1c7696ccefb',
    },
  },
  owner: 'martinmort',
};

export default config;
