/**
 * 格式化工具（跨端基建统一 批2）：实现上收共享包 @meimart/format（D11 并集），
 * 本文件改 re-export 壳——导出名全部保留，调用方 import 路径不变（本地双实现删除）。
 */
export {
  formatPrice,
  formatDate,
  formatEta,
  maskPhone,
  getRelativeTimeUnit,
  formatCompactNumber,
  formatDistance,
  toIntlLocale,
  type FormatCurrencyOptions,
  type RelativeTimeUnit,
} from '@meimart/format';
