import type { CartItem } from '@/types';

export interface OrderItemsCardProps {
  items: CartItem[];
  /** 卡片标题，默认 t('order.items') */
  title?: string;
  /** 点击单条商品的回调。不传则不可点 */
  onItemPress?: (item: CartItem) => void;
  testID?: string;
}
