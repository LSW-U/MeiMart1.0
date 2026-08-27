/**
 * 取货点距用户的估算距离（基于总距离偏移）。
 * 1.3 = 估算偏移常量，0.5 = 下限保护。
 *
 * 距离计费批次1 #5 收尾（2026-08-27）：参数放宽 number | undefined。
 * undefined（distanceKm 缺失，历史订单无坐标）→ 返回 undefined，
 * 调用方 formatDistance(undefined) 同步降级隐藏取货点距离标签。
 */
export function pickupDistance(totalKm: number | undefined): number | undefined {
  if (totalKm == null) return undefined;
  return Math.max(totalKm - 1.3, 0.5);
}
