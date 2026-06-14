import type { BottomTab } from '@/types';

export interface BottomNavProps {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
  testID?: string;
}

export const BOTTOM_TAB_ITEMS: { key: BottomTab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'categories', label: 'Categories', icon: 'view-grid' },
  { key: 'cart', label: 'Cart', icon: 'cart' },
  { key: 'orders', label: 'Orders', icon: 'clipboard-list' },
  { key: 'account', label: 'Account', icon: 'account' },
];
