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
