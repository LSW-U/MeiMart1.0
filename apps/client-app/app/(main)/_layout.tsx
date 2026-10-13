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
        // Why: #1B 实测修复 —— profile 路由对应 tab key 'account'，直传致 Account 永不高亮
        //   （route name 是路由段名 'profile'，不在 BottomTab 联合类型内，先放宽为 string 再比较）
        const raw = (state?.routes[state.index]?.name ?? 'home') as string;
        const current = (raw === 'profile' ? 'account' : raw) as BottomTab;
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
