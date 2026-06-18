import type { CartItem } from '@/types';

export interface CartItemRowProps {
  item: CartItem;
  /** 点击 Checkbox 触发（通常用于 toggle 选中状态） */
  onPress?: (item: CartItem) => void;
  /** 点击商品行（图/名/价格区域）触发，通常用于跳商品详情 */
  onItemPress?: (item: CartItem) => void;
  onQuantityChange?: (quantity: number) => void;
  onDelete?: (item: CartItem) => void;
  showControls?: boolean;
  testID?: string;
}
