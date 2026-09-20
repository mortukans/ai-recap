import { Tabs } from 'expo-router';

import { FloatingTabBar } from '../../design/FloatingTabBar';
import { useTheme } from '../../design/useTheme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar state={props.state} navigation={props.navigation} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="contexts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
