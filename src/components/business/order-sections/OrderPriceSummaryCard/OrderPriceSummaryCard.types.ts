export interface OrderPriceSummaryCardProps {
  subtotal: number;
  shipping: number;
  /** 优惠金额（正数），不传则不显示优惠行 */
  discount?: number;
  total: number;
  /** 卡片标题，默认 t('order.priceSummary') */
  title?: string;
  testID?: string;
}
