/**
 * 取货点距用户的估算距离（基于总距离偏移）。
 * 1.3 = 估算偏移常量，0.5 = 下限保护。
 */
export function pickupDistance(totalKm: number): number {
  return Math.max(totalKm - 1.3, 0.5);
}
