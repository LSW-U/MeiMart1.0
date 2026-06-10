import { Tabs } from 'expo-router';

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
      <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
