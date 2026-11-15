// 底部浮层预留高度（20261116 收敛）——动态算（同 home.tsx bottomReserve 先例），
// 取代四页各写各的静态口径（search 的 xxl*2+64=160px 偏大且不兜 inset 环境）。
// Why: 魔法数曾两次漂移（FCB 56→64；categories 96px 被胶囊盖住 20261116 用户实测），
//   单点定义避免下次再改浮层高度时跨页漏改。
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 浮动 BottomNav 高度（src/components/layout/BottomNav）
export const BOTTOM_NAV_HEIGHT = 56;
// 悬浮购物车条高（src/components/business/FloatingCartBar，20261112 增高 56→64）
export const CART_BAR_HEIGHT = 64;

/**
 * 滚动容器底部预留：
 * - 底部手势条 inset + 余量 8
 * - (main) 组内浮动 BottomNav(56)——组外根 stack 页传 withoutNav
 * - 页面挂 FloatingCartBar 时加购物车条高(64)
 */
export function useBottomReserve(opts?: { withoutNav?: boolean; withCartBar?: boolean }): number {
  const insets = useSafeAreaInsets();
  const nav = opts?.withoutNav ? 0 : BOTTOM_NAV_HEIGHT;
  const cartBar = opts?.withCartBar ? CART_BAR_HEIGHT : 0;
  return nav + insets.bottom + 8 + cartBar;
}
