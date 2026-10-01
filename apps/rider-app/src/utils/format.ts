/**
 * 格式化工具（跨端基建统一 批2）：实现上收共享包 @meimart/format（D11 并集——
 * formatCurrency 并入 formatPrice 统一签名，sign/decimals 选项与 formatter 缓存保留），
 * 本文件改 re-export 壳——导出名保留（formatCurrency 为兼容别名），本地双实现删除。
 */
import { formatPrice } from '@meimart/format';
import type { FormatCurrencyOptions } from '@meimart/format';

export { formatPrice, formatDistance, type FormatCurrencyOptions } from '@meimart/format';

/** rider 旧导出名兼容别名：formatCurrency(value, currency, opts?) ≡ formatPrice(value, currency, decimals, opts)。
 * 边界差异（审查 P3-2 记账）：多字符未知 ISO 旧版直通原串（如 'Rp'），新统一走符号映射表 → 空符号；
 * 现网调用方只传 common.currency '$' 与显式符号，无实害。非有限数值统一归 $0.00（P3-1）。 */
export function formatCurrency(
  value: number,
  currency: string,
  opts?: FormatCurrencyOptions,
): string {
  return formatPrice(value, currency, opts?.decimals ?? 2, opts);
}
