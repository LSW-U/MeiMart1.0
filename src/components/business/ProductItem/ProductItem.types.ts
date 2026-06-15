import type { CartItem } from '@/types';

export type ProductItemLayout = 'row' | 'cart';

export interface ProductItemProps {
  item: CartItem;
  onPress?: (item: CartItem) => void;
  /**
   * 'row'（默认）：横向卡片，只展示信息（CheckoutPage / OrderDetailPage）
   * 'cart'：购物车模式，展示数量增减按钮（add_circle / remove）
   */
  layout?: ProductItemLayout;
  /** 数量增加回调（layout='cart' 时启用） */
  onIncrease?: (item: CartItem) => void;
  /** 数量减少回调（layout='cart' 时启用） */
  onDecrease?: (item: CartItem) => void;
  testID?: string;
}
