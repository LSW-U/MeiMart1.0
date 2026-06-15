import { Tabs, useRouter } from 'expo-router';
import { BottomNav } from '@/components/layout/BottomNav';
import type { BottomTab } from '@/types';

const TAB_ROUTES: Record<BottomTab, string> = {
  home: '/(main)/home',
  categories: '/(main)/categories',
  cart: '/(main)/cart',
  orders: '/(main)/orders',
  account: '/(main)/profile',
};

export default function MainLayout() {
  const router = useRouter();
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      tabBar={({ navigation }) => {
        const state = navigation.getState();
        const current = (state?.routes[state.index]?.name ?? 'home') as BottomTab;
        return <BottomNav activeTab={current} onTabPress={(tab) => router.push(TAB_ROUTES[tab])} />;
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="categories" options={{ title: 'Categories' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="profile" options={{ title: 'Account' }} />
    </Tabs>
  );
}
