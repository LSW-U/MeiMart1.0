const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  IDR: 'Rp',
  AUD: 'A$',
};

export function formatPrice(value: number, currency = 'USD', decimals = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  const safe = Number.isFinite(value) ? value : 0;
  const formatted = safe.toFixed(decimals);
  return `${symbol}${formatted}`;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function formatDate(iso: string, locale = 'zh-CN'): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(locale, {
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

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  const head = phone.slice(0, 3);
  const tail = phone.slice(-3);
  const middle = '*'.repeat(phone.length - 6);
  return `${head}${middle}${tail}`;
}

/**
 * 相对时间（评论卡「2 days ago」用）- 纯计算，返回 i18n key 后缀 + count，
 * 由调用方用 t(`common.relTime.${unit}`, { count }) 拼装，文案全部走 i18n。
 *
 * Why: 评论 createdAt 是 ISO 时间戳，前端展示相对时间；不引入 dayjs（v0.2 未提及）。
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
