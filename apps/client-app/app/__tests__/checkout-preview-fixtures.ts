/**
 * CheckoutPreview 前端形态 fixture（批D D2 测试共享）。
 * 与 src/services/cart.ts checkoutPreview 返回类型一致（金额已分→元）。
 */
export interface WarehouseMatchView {
  id: string;
  code: string;
  deliveryFee: number;
  acceptingReservation: boolean;
  nextOpenAt: string | null;
}

export interface PreviewResponse {
  items: unknown[];
  warehouseMatch: WarehouseMatchView | null;
  itemsSubtotal: number;
  deliveryFee: number;
  payableAmount: number;
  discount: number;
  couponCode: string | null;
  couponValid: boolean;
  warnings: string[];
  estimatedDeliveryTime: string;
}
