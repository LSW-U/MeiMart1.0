import type { CartItem } from '@/types';

export interface CartItemRowProps {
  item: CartItem;
  /** 点击 Checkbox 触发（通常用于 toggle 选中状态） */
  onPress?: (item: CartItem) => void;
  /** 点击商品行（图/名/价格区域）触发，通常用于跳商品详情 */
  onItemPress?: (item: CartItem) => void;
  onQuantityChange?: (quantity: number) => void;
  /** 管理态：点击最右侧 trash 删除按钮触发（仅管理模式传入，默认态不传→不显示） */
  onDelete?: (item: CartItem) => void;
  /**
   * 覆盖 Checkbox 选中态。默认读 item.selected；
   * 管理模式传入 selectedForDelete.has(item.id)，让 checkbox 反映删除选中而非结算选中。
   */
  checkedOverride?: boolean;
  showControls?: boolean;
  testID?: string;
}
