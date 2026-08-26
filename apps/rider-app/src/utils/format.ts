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

/** 距离展示格式：`3.5km`（无空格，对齐页面内联现状） */
export function formatDistance(kilometers: number): string {
  return `${kilometers.toFixed(1)}km`;
}
