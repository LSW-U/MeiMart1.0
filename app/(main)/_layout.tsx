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
      <Tabs.Screen name="home" options={{ title: '首页' }} />
      <Tabs.Screen name="categories" options={{ title: '分类' }} />
      <Tabs.Screen name="cart" options={{ title: '购物车' }} />
      <Tabs.Screen name="orders" options={{ title: '订单' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}
