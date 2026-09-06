import {
  formatPrice,
  formatCompactNumber,
  formatDate,
  formatEta,
  maskPhone,
  toIntlLocale,
} from '../format';

describe('formatPrice', () => {
  it('formats USD with $ symbol', () => {
    expect(formatPrice(9.99, 'USD')).toBe('$9.99');
  });
  it('formats CNY', () => {
    expect(formatPrice(100, 'CNY', 0)).toBe('¥100');
  });
  it('handles non-finite values', () => {
    expect(formatPrice(Number.NaN)).toBe('$0.00');
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe('$0.00');
  });
  it('respects decimals', () => {
    expect(formatPrice(10, 'USD', 0)).toBe('$10');
    expect(formatPrice(10.123, 'USD', 2)).toBe('$10.12');
  });
  it('falls back to empty symbol for unknown currency', () => {
    expect(formatPrice(5, 'EUR')).toBe('5.00');
  });
  it('adds US-style thousands separator (Q6: money fixed en-US across languages)', () => {
    expect(formatPrice(1234567.89, 'USD')).toBe('$1,234,567.89');
    expect(formatPrice(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatPrice(999.99, 'USD')).toBe('$999.99');
  });
});

describe('toIntlLocale', () => {
  it('maps UI language codes to Intl locales (v2 §2.5)', () => {
    expect(toIntlLocale('zh')).toBe('zh-CN');
    expect(toIntlLocale('pt')).toBe('pt');
    expect(toIntlLocale('id')).toBe('id');
    expect(toIntlLocale('en')).toBe('en-US');
    // Why: Intl 无 Tetum，tet 回退 en-US
    expect(toIntlLocale('tet')).toBe('en-US');
  });
  it('matches on base code for region-suffixed input', () => {
    expect(toIntlLocale('zh-CN')).toBe('zh-CN');
    expect(toIntlLocale('pt-BR')).toBe('pt');
    expect(toIntlLocale('en-US')).toBe('en-US');
  });
});

describe('formatCompactNumber', () => {
  it('formats thousands', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
  });
  it('formats millions', () => {
    expect(formatCompactNumber(2_300_000)).toBe('2.3M');
  });
  it('passes through small numbers', () => {
    expect(formatCompactNumber(42)).toBe('42');
  });
});

describe('formatDate', () => {
  it('formats ISO string', () => {
    const result = formatDate('2026-06-15T10:00:00Z', 'en-US');
    expect(result).toMatch(/2026/);
  });
  it('passes through invalid input', () => {
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('formatEta', () => {
  it('formats ETA without year', () => {
    const result = formatEta('2026-07-30T15:00:00Z', 'en-US');
    // Why: ETA 只展示月日+时分，不应含年份
    expect(result).toMatch(/30/);
    expect(result).not.toMatch(/2026/);
  });
  it('passes through invalid input', () => {
    expect(formatEta('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('13800138000')).toBe('138*****000');
  });
  it('returns short input unchanged', () => {
    expect(maskPhone('123')).toBe('123');
  });
  it('handles empty input', () => {
    expect(maskPhone('')).toBe('');
  });
});
