/**
 * @meimart/format 单测（跨端基建统一 批2 验收①③）
 *
 * 覆盖（任务书 §1）：千分位、ISO→符号映射、sign 选项、decimals 缓存命中、
 * 四语日期（toIntlLocale 链）、maskPhone 中段打码、relativeTime 分档。
 * 另锚定两端既有行为（M2 并集不丢）：client 单字符符号透传 / rider sign+缓存。
 */
import {
  formatPrice,
  formatDate,
  formatEta,
  maskPhone,
  getRelativeTimeUnit,
  formatCompactNumber,
  formatDistance,
  toIntlLocale,
} from '../src';

describe('formatPrice（D11 并集）', () => {
  it('ISO 代码 → 符号映射表（client 版能力）', () => {
    expect(formatPrice(9.99, 'USD')).toBe('$9.99');
    expect(formatPrice(100, 'CNY', 0)).toBe('¥100');
    expect(formatPrice(1000, 'IDR', 0)).toBe('Rp1,000');
    expect(formatPrice(5, 'AUD')).toBe('A$5.00');
  });

  it('未知 ISO 代码回退空符号（client 版语义不丢）', () => {
    expect(formatPrice(5, 'EUR')).toBe('5.00');
  });

  it('单字符符号原样透传（client PriceText 旧调用方兼容）', () => {
    expect(formatPrice(3.5, '$')).toBe('$3.50');
    expect(formatPrice(3.5, '¥')).toBe('¥3.50');
  });

  it('非有限数值安全归 0', () => {
    expect(formatPrice(Number.NaN)).toBe('$0.00');
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe('$0.00');
  });

  it('千分位固定美式（Q6：金额跨语言一致）', () => {
    expect(formatPrice(1234567.89, 'USD')).toBe('$1,234,567.89');
    expect(formatPrice(999.99, 'USD')).toBe('$999.99');
  });

  it('sign 选项带 +/- 前缀，主体取绝对值（rider 版能力，M2 不丢）', () => {
    expect(formatPrice(12.5, '$', 2, { sign: true })).toBe('+$12.50');
    expect(formatPrice(-12.5, '$', 2, { sign: true })).toBe('-$12.50');
    expect(formatPrice(0, '$', 2, { sign: true })).toBe('+$0.00');
    // sign=false（默认）负值不带符号（与 rider 版一致：主体 abs，前缀不加）
    expect(formatPrice(-12.5, '$')).toBe('$12.50');
  });

  it('decimals 选项（rider sign+decimals 组合）', () => {
    expect(formatPrice(12.5, '$', 0)).toBe('$13');
    expect(formatPrice(12.34, '$', 1)).toBe('$12.3');
    expect(formatPrice(-12.36, '$', 1, { sign: true })).toBe('-$12.4');
  });

  it('decimals 缓存命中：同 decimals 重复调用返回同一 formatter 产物（缓存 Map 生效）', () => {
    // 行为锚定：缓存键是 decimals（非 currency），不同 currency 同 decimals 走同一 formatter
    expect(formatPrice(1.5, 'USD', 2)).toBe('$1.50');
    expect(formatPrice(2.5, 'CNY', 2)).toBe('¥2.50');
    expect(formatPrice(3.5, '$', 2)).toBe('$3.50');
  });
});

describe('toIntlLocale（i18n-core 单源 re-export）', () => {
  it('四语映射（tet→en-US 回退）', () => {
    expect(toIntlLocale('zh')).toBe('zh-CN');
    expect(toIntlLocale('en')).toBe('en-US');
    expect(toIntlLocale('tet')).toBe('en-US');
    expect(toIntlLocale('pt')).toBe('pt');
    expect(toIntlLocale('id')).toBe('id');
  });
  it('带地区码取基础码命中', () => {
    expect(toIntlLocale('zh-CN')).toBe('zh-CN');
    expect(toIntlLocale('pt-BR')).toBe('pt');
  });
});

describe('formatDate / formatEta（四语日期）', () => {
  it('formatDate 含年份', () => {
    const result = formatDate('2026-06-15T10:00:00Z', 'en');
    expect(result).toMatch(/2026/);
  });
  it('formatEta 无年份（ETA 不关心年）', () => {
    const result = formatEta('2026-07-30T15:00:00Z', 'en');
    expect(result).toMatch(/30/);
    expect(result).not.toMatch(/2026/);
  });
  it('tet locale 走 en-US 回退不抛错', () => {
    expect(formatDate('2026-06-15T10:00:00Z', 'tet')).toMatch(/2026/);
    expect(formatEta('2026-06-15T10:00:00Z', 'tet')).not.toMatch(/2026/);
  });
  it('非法输入原样返回', () => {
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
    expect(formatEta('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('maskPhone（中段打码）', () => {
  it('中段打星，首尾各留 3 位', () => {
    expect(maskPhone('13800138000')).toBe('138*****000');
  });
  it('过短/空串原样返回', () => {
    expect(maskPhone('123')).toBe('123');
    expect(maskPhone('')).toBe('');
  });
});

describe('getRelativeTimeUnit（分档）', () => {
  it('非法输入 → justNow/0', () => {
    expect(getRelativeTimeUnit('not-a-date')).toEqual({ unit: 'justNow', count: 0 });
  });
  it('未来时间戳按 0 处理（不出现负数档）', () => {
    expect(getRelativeTimeUnit(new Date(Date.now() + 60_000).toISOString())).toEqual({
      unit: 'justNow',
      count: 0,
    });
  });
  it('60s 内 justNow；分钟/小时/天/周/月逐档', () => {
    const iso = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString();
    expect(getRelativeTimeUnit(iso(30))).toEqual({ unit: 'justNow', count: 0 });
    expect(getRelativeTimeUnit(iso(120))).toEqual({ unit: 'minutesAgo', count: 2 });
    expect(getRelativeTimeUnit(iso(3600))).toEqual({ unit: 'hoursAgo', count: 1 });
    expect(getRelativeTimeUnit(iso(86400 * 2))).toEqual({ unit: 'daysAgo', count: 2 });
    expect(getRelativeTimeUnit(iso(86400 * 10))).toEqual({ unit: 'weeksAgo', count: 1 });
    // ≥5 周落月档（Math.floor(day/30)，day=70 → 2）
    expect(getRelativeTimeUnit(iso(86400 * 70))).toEqual({ unit: 'monthsAgo', count: 2 });
  });
});

describe('formatCompactNumber', () => {
  it('K/M 档与小数原样', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(2_300_000)).toBe('2.3M');
    expect(formatCompactNumber(42)).toBe('42');
  });
});

describe('formatDistance（rider 距离语义上收）', () => {
  it('一位小数 + km 无空格', () => {
    expect(formatDistance(5)).toBe('5.0km');
    expect(formatDistance(3.7)).toBe('3.7km');
    expect(formatDistance(0)).toBe('0.0km');
  });
  it('undefined → undefined（调用方隐藏标签）', () => {
    expect(formatDistance(undefined)).toBeUndefined();
  });
});
