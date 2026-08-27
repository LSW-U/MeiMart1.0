import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

/**
 * 配送费距离计费响应（8 字段契约，距离计费批次1 2026-08-27 sync 后对齐）
 *
 * 后端 GET /client/pricing/delivery-fee?warehouseId=&lat=&lng= 返回 DeliveryFeeResult：
 *   - baseFee / distanceFee / deliveryFee 单位均为「分」（USD cents）
 *   - distanceKm：PostGIS ST_DistanceSphere(仓库中心→收货地址)，球面计费距离；null = 无坐标
 *   - freeKm：免费起步距离（km），默认 2
 *   - perKmFee：每公里加价（分），0 = 距离计费未启用（灰度安全网，退化为 baseFee）
 *
 * Why: pricing 是结算页配送费试算端点（CheckoutPage 依赖），距离计费后前端展示费用明细
 */
export interface DeliveryFeeResult {
  warehouseId: string;
  /** 基础配送费（分）= warehouse.deliveryFee */
  baseFee: number;
  /** 每公里加价（分）= warehouse.perKmFee；0 = 距离计费未启用 */
  perKmFee: number;
  /** 免费起步距离（km）= warehouse.freeKm，默认 2 */
  freeKm: number;
  /** 计费距离（km），PostGIS 球面距离；null = 无坐标（不应发生在下单路径） */
  distanceKm: number | null;
  /** 距离加价（分）= max(0, distanceKm - freeKm) × perKmFee，Math.round 取整 */
  distanceFee: number;
  /** 配送费总额（分）= Math.round(baseFee + 距离加价)；perKmFee=0 时 = baseFee */
  deliveryFee: number;
  currency: 'USD';
}

export const pricingApi = {
  // 距离计费批次1（2026-08-27）：删除 checkMinOrder / /client/pricing/min-order-check 死方法
  //   后端已 [BREAKING] 删端点（checkMinOrder 死代码，createOrder 不调用，起送价本期不生效）。
  //   起送价需求激活时（后端恢复端点 + 读 warehouse.minOrderAmount）再恢复本方法。

  /**
   * 配送费试算（PostGIS ST_DistanceSphere 球面距离 + 仓库 baseFee/perKmFee/freeKm 计算）
   *
   * @param warehouseId 仓库 ID（下单时按收货地址 coverageArea 匹配的最近仓库）
   * @param lat 纬度（收货地址）
   * @param lng 经度（收货地址）
   * @returns DeliveryFeeResult 8 字段（含距离费明细）
   */
  async getDeliveryFee(
    warehouseId: string,
    lat: number,
    lng: number,
  ): Promise<DeliveryFeeResult> {
    if (isMockMode) {
      // mock：baseFee=500、freeKm=2、perKmFee=0（灰度安全网，退化为 baseFee）
      return mockResponse<DeliveryFeeResult>({
        warehouseId,
        baseFee: 500,
        perKmFee: 0,
        freeKm: 2,
        distanceKm: 3,
        distanceFee: 0, // perKmFee=0 → 距离费 0
        deliveryFee: 500, // 退化为 baseFee
        currency: 'USD',
      });
    }
    const res = await api.get<DeliveryFeeResult>('/client/pricing/delivery-fee', {
      params: { warehouseId, lat, lng },
    });
    return res.data;
  },
};
