import { Tabs } from 'expo-router';

import { AppIcon } from '../../src/components/ui';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#720003',
        tabBarInactiveTintColor: '#8d716c',
        tabBarStyle: {
          backgroundColor: '#fff8f7',
          borderTopColor: '#f7ddd9',
        },
      }}
    >
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <AppIcon name="orders" className="text-xl" style={{ color }} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color }) => <AppIcon name="wallet" className="text-xl" style={{ color }} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <AppIcon name="settings" className="text-xl" style={{ color }} /> }} />
    </Tabs>
  );
}
