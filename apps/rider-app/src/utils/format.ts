/**
 * 金额格式化（B6 收口）——货币符号由 i18n common.currency 提供（zh/en/id/tet/pt 均为 $，USD 官方货币），
 * 调用方必传，从根上杜绝 USD/Intl locale 硬编码（资金敏感）。
 *
 * 千分位（批C 语言优化）：固定美式千分位（方案 v2 §2.6 金额跨语言一致，`$1,234.56` 不随语言变），
 * 走 Intl.NumberFormat（CLAUDE.md 数字格式用 Intl 规范）；按 decimals 缓存 formatter（列表高频渲染避免重复构造）。
 */
export interface FormatCurrencyOptions {
  /** 小数位数，默认 2 */
  decimals?: number;
  /** 是否带 +/- 符号（收支流水），默认 false */
  sign?: boolean;
}

const currencyFormatters = new Map<number, Intl.NumberFormat>();

function getCurrencyFormatter(decimals: number): Intl.NumberFormat {
  let fmt = currencyFormatters.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    currencyFormatters.set(decimals, fmt);
  }
  return fmt;
}

export function formatCurrency(
  value: number,
  currency: string,
  opts?: FormatCurrencyOptions,
): string {
  const decimals = opts?.decimals ?? 2;
  const body = getCurrencyFormatter(decimals).format(Math.abs(value));
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
