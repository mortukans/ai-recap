/**
 * Floating tab bar (HANDOFF.md §4): a 64-pt pill with three tabs plus a separate round record button.
 * Content scrolls beneath it — screens add `Layout.tabBarClearance` to their bottom padding.
 */
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStartRecording } from '../features/recording/useStartRecording';
import { PulseRing } from './components';
import { Icon, type IconName } from './icons';
import { Layout } from './tokens';
import { Type } from './typography';
import { useTheme } from './useTheme';

const ICONS: Record<string, IconName> = { index: 'mic', contexts: 'contexts', settings: 'settings' };

/** Minimal structural type for the `tabBar` render prop (avoids pinning a second copy of bottom-tabs). */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { start } = useStartRecording();
  const activeBg = t.scheme === 'light' ? t.primaryBtn : t.surface2;
  const bottom = Math.max(Layout.tabBarBottom, insets.bottom + 8);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom, left: Layout.tabBarInset, right: Layout.tabBarInset }]}>
      <View style={[styles.pill, { backgroundColor: t.glass, borderColor: t.line }, t.shadows.float]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = tr(`tabs.${route.name === 'index' ? 'recaps' : route.name}`);
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={[styles.tab, focused && { backgroundColor: activeBg }]}>
              <Icon name={ICONS[route.name] ?? 'mic'} size={22} color={focused ? t.accent : t.text2} />
              <Text style={[focused ? Type.tabLabel : { ...Type.tabLabel, fontFamily: 'HankenGrotesk_500Medium' }, { color: focused ? (t.scheme === 'light' ? t.onPrimaryBtn : t.text) : t.text2 }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('home.startRecap')}
        onPress={() => void start()}
        style={({ pressed }) => [styles.record, { backgroundColor: t.record, transform: [{ scale: pressed ? 0.96 : 1 }] }, t.shadows.record]}>
        <PulseRing size={Layout.tabBarHeight} color={t.record} />
        <Icon name="mic" size={26} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { flex: 1, height: Layout.tabBarHeight, borderRadius: Layout.tabBarHeight / 2, borderWidth: 1, padding: 6, flexDirection: 'row' },
  tab: { flex: 1, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 3 },
  record: { width: Layout.tabBarHeight, height: Layout.tabBarHeight, borderRadius: Layout.tabBarHeight / 2, alignItems: 'center', justifyContent: 'center' },
});
