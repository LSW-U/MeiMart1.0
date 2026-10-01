/**
 * @meimart/format — MeiMart1.0 client/rider 共享格式化核心（跨端基建统一 批2，2026-10-01）
 *
 * 单源共享（方案v2 D11 能力并集，M2 修正：rider 版更完善，禁 client 版反向覆盖）：
 *   - formatPrice(value, currency, decimals?, opts?)   client 符号映射表 ∪ rider sign 选项
 *                                                      + formatter 按 decimals 缓存（列表高频渲染）
 *   - formatDate(iso, locale) / formatEta(iso, locale)  日期时间（含年/无年），UI 语言码入参
 *   - maskPhone(phone)                                  中段打码
 *   - getRelativeTimeUnit(iso)                          相对时间分档（返回 i18n key 后缀 + count）
 *   - formatCompactNumber(value)                        1.5K / 2.3M 紧凑数字
 *   - formatDistance(km)                                `3.5km`（undefined → undefined，调用方隐藏标签）
 *   - toIntlLocale                                      re-export @meimart/i18n-core（避免双包重复，任务书 §1）
 *
 * 金额口径：固定美式千分位（$1,234.56 不随 UI 语言变，语言优化方案 v2 §2.6）。
 */
import { toIntlLocale as toIntlLocaleCore } from '@meimart/i18n-core';

/** client 版 ISO 代码 → 符号映射表（原 client utils/format.ts，原样上收） */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  IDR: 'Rp',
  AUD: 'A$',
};

/** rider 版选项（原 rider utils/format.ts FormatCurrencyOptions，原样上收） */
export interface FormatCurrencyOptions {
  /** 小数位数，默认 2 */
  decimals?: number;
  /** 是否带 +/- 符号（收支流水），默认 false */
  sign?: boolean;
}

// Why: formatter 按 decimals 缓存（M2 rider 版能力）——列表高频渲染避免重复构造 Intl.NumberFormat
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

/** 单字符符号判定（client 版语义：'$'/'¥' 原样透传，PriceText 旧调用方兼容） */
function isSymbolChar(currency: string): boolean {
  return /^[^A-Za-z0-9]$/.test(currency);
}

/**
 * 金额格式化（D11 并集）。
 * - currency 传 ISO 代码（'USD'）查映射表；单字符符号（'$'/'¥'）原样透传；未知 ISO 代码回退空符号（client 版语义）
 * - opts.sign 为 true 时带 +/- 前缀（rider 版语义：value>=0 → '+'，负值 → '-'，主体取绝对值）
 * - 非有限数值安全归 0（client 版语义）
 *
 * ⚠️ 负值契约（审查 P1-1，批2 修复落档）：负值展示必须走 sign 档（`{ sign: true }` +
 * 负值入参 → `-$5.00`）；无 sign 档时负值输出**不带负号**（主体恒取 abs——rider 版
 * 并集语义，收支流水靠 sign 前缀区分正负）。后续调用方传负值不加 sign 档 = 静默丢负号。
 */
export function formatPrice(
  value: number,
  currency = 'USD',
  decimals = 2,
  opts?: FormatCurrencyOptions,
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? (isSymbolChar(currency) ? currency : '');
  const safe = Number.isFinite(value) ? value : 0;
  const body = getCurrencyFormatter(decimals).format(Math.abs(safe));
  if (opts?.sign) {
    const prefix = safe >= 0 ? '+' : '-';
    return `${prefix}${symbol}${body}`;
  }
  return `${symbol}${body}`;
}

/** 日期时间（月日时分，含年）。locale 传 UI 语言码，内部经 toIntlLocale 映射（tet→en-US 回退） */
export function formatDate(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(toIntlLocaleCore(locale), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

/**
 * 预估送达时间（B9 ETA）：月日 + 时分，无年份（用户只关心哪天到，不关心年）。
 * locale 传 UI 语言码，内部经 toIntlLocale 映射（tet→en-US 回退）。
 */
export function formatEta(iso: string, locale: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(toIntlLocaleCore(locale), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}

/** 手机号中段打码：<7 位原样返回（过短无可打码中段） */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const head = phone.slice(0, 3);
  const tail = phone.slice(-3);
  const middle = '*'.repeat(phone.length - 6);
  return `${head}${middle}${tail}`;
}

/**
 * 相对时间（评论卡/通知卡）- 纯计算，返回 i18n key 后缀 + count，
 * 由调用方用 t(`common.relTime.${unit}`, { count }) 拼装，文案全部走 i18n。
 */
export type RelativeTimeUnit =
  | 'justNow'
  | 'minutesAgo'
  | 'hoursAgo'
  | 'daysAgo'
  | 'weeksAgo'
  | 'monthsAgo';

export function getRelativeTimeUnit(iso: string): { unit: RelativeTimeUnit; count: number } {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return { unit: 'justNow', count: 0 };
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return { unit: 'justNow', count: 0 };
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return { unit: 'minutesAgo', count: diffMin };
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return { unit: 'hoursAgo', count: diffHr };
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return { unit: 'daysAgo', count: diffDay };
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return { unit: 'weeksAgo', count: diffWeek };
  const diffMonth = Math.floor(diffDay / 30);
  return { unit: 'monthsAgo', count: Math.max(1, diffMonth) };
}

/** 紧凑数字：1.5K / 2.3M（商品销量/搜索热度） */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/**
 * 距离展示格式：`3.5km`（无空格，对齐页面内联现状）。
 * undefined → 返回 undefined（调用方隐藏距离标签，而非渲染 `NaNkm`/`undefinedkm`）。
 * 适用于 distanceKm / billingDistanceKm 任一缺失的历史订单降级场景。
 */
export function formatDistance(kilometers: number | undefined): string | undefined {
  if (kilometers == null) return undefined;
  return `${kilometers.toFixed(1)}km`;
}

// Why: toIntlLocale 单源在 i18n-core（任务书 §1「避免双包重复」），re-export 保持调用方单入口
export { toIntlLocaleCore as toIntlLocale };
