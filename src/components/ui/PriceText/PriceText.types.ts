export type PriceSize = 'sm' | 'md' | 'lg';

export interface PriceTextProps {
  /** 当前价格 */
  value: number;
  /** 货币符号，默认 '$' */
  currency?: string;
  /** 尺寸：sm（小号） / md（中号） / lg（大号，使用 price-display） */
  size?: PriceSize;
  /** 原价（可选，提供则显示划线价） */
  originalPrice?: number;
  /** 是否对原价显示划线，默认 true */
  strikeThroughOriginal?: boolean;
  /** 小数位数，默认 2 */
  decimals?: number;
  /** 测试 ID */
  testID?: string;
}
