import type { BottomTab } from '@/types';

export interface BottomNavProps {
  activeTab: BottomTab;
  onTabPress: (tab: BottomTab) => void;
  testID?: string;
}

// Why: #1A 实测修复 —— label 原为硬编码英文，改存 tabs.* i18n key（四语已齐备），BottomNav 渲染时经 t() 消费
export const BOTTOM_TAB_ITEMS: { key: BottomTab; labelKey: string; icon: string }[] = [
  { key: 'home', labelKey: 'tabs.home', icon: 'home' },
  { key: 'categories', labelKey: 'tabs.categories', icon: 'view-grid' },
  { key: 'cart', labelKey: 'tabs.cart', icon: 'cart' },
  { key: 'orders', labelKey: 'tabs.orders', icon: 'clipboard-list' },
  { key: 'account', labelKey: 'tabs.account', icon: 'account' },
];
