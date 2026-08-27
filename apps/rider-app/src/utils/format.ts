/**
 * 金额格式化（B6 收口）——货币符号由 i18n common.currency 提供（zh/en/id/tet/pt 均为 $，USD 官方货币），
 * 调用方必传，从根上杜绝 USD/Intl locale 硬编码（资金敏感）。
 */
export interface FormatCurrencyOptions {
  /** 小数位数，默认 2 */
  decimals?: number;
  /** 是否带 +/- 符号（收支流水），默认 false */
  sign?: boolean;
}

export function formatCurrency(
  value: number,
  currency: string,
  opts?: FormatCurrencyOptions,
): string {
  const decimals = opts?.decimals ?? 2;
  const body = Math.abs(value).toFixed(decimals);
  if (opts?.sign) {
    const prefix = value >= 0 ? '+' : '-';
    return `${prefix}${currency}${body}`;
  }
  return `${currency}${body}`;
}

/**
 * 距离展示格式：`3.5km`（无空格，对齐页面内联现状）
 *
 * 距离计费批次1 #5 收尾（2026-08-27）：参数放宽 number | undefined。
 * undefined → 返回 undefined（调用方隐藏距离标签，而非渲染 `NaNkm`/`undefinedkm`）。
 * 适用于 distanceKm / billingDistanceKm 任一缺失的历史订单降级场景。
 */
export function formatDistance(kilometers: number | undefined): string | undefined {
  if (kilometers == null) return undefined;
  return `${kilometers.toFixed(1)}km`;
}
