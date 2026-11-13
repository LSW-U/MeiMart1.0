import type { CartItem } from '@/types';

export interface CartItemRowProps {
  item: CartItem;
  /** 点击 Checkbox 触发（通常用于 toggle 选中状态） */
  onPress?: (item: CartItem) => void;
  /**
   * 断货态（20261114 库存感知批，拍板 B）：stock===0 时行灰显、checkbox 禁用（点击 toast）、
   * 价格位替换「缺货」badge。由页面层判定传入（组件不读 stock，保持展示纯函数）。
   */
  soldOut?: boolean;
  /** 断货/紧张提示点击 toast 文案（soldOut 时 checkbox 点击消费；不传无 toast） */
  soldOutHint?: string;
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
