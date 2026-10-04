/**
 * @meimart/i18n-core 单测（跨端基建统一 批1，任务书 §1）
 *
 * 覆盖：回退链全分支 / 非法入参 / 注入前调用行为 / 键集收敛能力（M6 评估依据）。
 * 参照 packages/upload-core __tests__ 范本（jest-expo preset + node 环境）。
 */
import {
  pickLocalized,
  localize,
  currentLocale,
  toIntlLocale,
  setLocaleRuntime,
  resetLocaleRuntime,
  SUPPORTED_LOCALES,
} from '../src/index';

afterEach(() => resetLocaleRuntime());

describe('pickLocalized 回退链', () => {
  const text = { zh: '苹果', en: 'Apple', tet: 'Apa', pt: 'Maçã' };

  it('① 当前语言有值 → 直接命中', () => {
    expect(pickLocalized(text, 'zh')).toBe('苹果');
    expect(pickLocalized(text, 'pt')).toBe('Maçã');
  });

  it('② 当前语言缺值 → 回退 en', () => {
    expect(pickLocalized({ en: 'Apple' }, 'tet')).toBe('Apple');
    expect(pickLocalized({ en: 'Apple', zh: '苹果' }, 'pt')).toBe('Apple');
  });

  it('③ en 也缺 → 回退 zh', () => {
    expect(pickLocalized({ zh: '苹果' }, 'tet')).toBe('苹果');
  });

  it('④ en/zh 全缺 → 首个可用值兜底（对象键序首个，含后端 5 语 id 键）', () => {
    expect(pickLocalized({ id: 'Apel', tet: 'Apa' }, 'zh')).toBe('Apel');
    expect(pickLocalized({ tet: 'Apa', id: 'Apel' }, 'zh')).toBe('Apa');
    expect(pickLocalized({ id: 'Apel' }, 'zh')).toBe('Apel');
  });

  it('⑤ 全空值/空 Record → fallback', () => {
    expect(pickLocalized({ zh: '', en: '' }, 'zh', 'FALLBACK')).toBe('FALLBACK');
    expect(pickLocalized({}, 'zh', 'FALLBACK')).toBe('FALLBACK');
    expect(pickLocalized({ zh: '', en: '' }, 'zh')).toBe('');
  });

  it('⑥ null/undefined/非 Record（数组、数字）→ fallback（D9 unknown 收窄在调用方）；纯字符串直通', () => {
    expect(pickLocalized(null, 'zh', 'FALLBACK')).toBe('FALLBACK');
    expect(pickLocalized(undefined, 'zh', 'FALLBACK')).toBe('FALLBACK');
    expect(pickLocalized(['a'] as unknown as Record<string, string>, 'zh', 'FALLBACK')).toBe(
      'FALLBACK',
    );
    expect(pickLocalized(3 as unknown as Record<string, string>, 'zh', 'FALLBACK')).toBe('FALLBACK');
    // 纯字符串直通（mock/后端降级单串）
    expect(pickLocalized('plain', 'zh')).toBe('plain');
    expect(pickLocalized('', 'zh', 'FALLBACK')).toBe('FALLBACK');
  });

  it('⑦ 默认 fallback 是空串（原 reviews 版语义）', () => {
    expect(pickLocalized(null, 'zh')).toBe('');
  });
});

describe('localize / currentLocale 运行时注入', () => {
  it('未注入时 currentLocale 回退 en，localize 走 en', () => {
    expect(currentLocale()).toBe('en');
    expect(localize({ en: 'Apple', zh: '苹果' })).toBe('Apple');
  });

  it('注入后 currentLocale 跟随事实源，localize 用运行时 locale', () => {
    setLocaleRuntime(() => 'zh');
    expect(currentLocale()).toBe('zh');
    expect(localize({ en: 'Apple', zh: '苹果' })).toBe('苹果');
  });

  it('重复注入以后者为准；复位后回退 en', () => {
    setLocaleRuntime(() => 'pt');
    setLocaleRuntime(() => 'tet');
    expect(currentLocale()).toBe('tet');
    resetLocaleRuntime();
    expect(currentLocale()).toBe('en');
  });

  it('注入函数抛错 → 回退 en（不崩调用方）；注入值信任事实源（rider id 直通不裁剪）', () => {
    setLocaleRuntime(() => {
      throw new Error('runtime not ready');
    });
    expect(currentLocale()).toBe('en');
    setLocaleRuntime(() => 'id' as never);
    expect(currentLocale()).toBe('id' as never);
  });
});

describe('键集收敛能力（M6：payment.ts toLocalizable 评估依据）', () => {
  it('前端未支持语言的键（后端 id）不会优先命中——回退链天然防泄漏', () => {
    // 后端 5 语 JSON：id 键存在但四语齐备 → id 永不选中
    const backend5 = { en: 'Cash on Delivery', zh: '货到付款', id: 'Bayar di tempat', tet: 'x', pt: 'y' };
    for (const locale of SUPPORTED_LOCALES) {
      const picked = pickLocalized(backend5, locale);
      expect(picked).not.toBe('Bayar di tempat');
    }
  });

  it('四语全缺仅剩 id → 「首个值」兜底可命中 id（有意保留：宁显示原文不显示空）', () => {
    expect(pickLocalized({ id: 'Bayar di tempat' }, 'zh')).toBe('Bayar di tempat');
  });

  it('批1 T4（D4/N8）：后端五语 Record（含 id）在四 locale 渲染均不丢字', () => {
    // 后端 I18nText 实际产出五语（en/zh/id/tet/pt），i18n-core SUPPORTED_LOCALES 无 id——
    // 断言 id 值经回退链被「对应 locale 值」兜住（优先命中本语），tet/pt 有值直取不丢，
    // 且四 locale 各自输出非空字符串（宁显示原文不显示空）
    const backend5 = {
      en: 'Bank transfer',
      zh: '银行转账',
      id: 'Transferensi bank',
      tet: 'Transferénsia bank',
      pt: 'Transferência bancária',
    };
    expect(pickLocalized(backend5, 'en')).toBe('Bank transfer');
    expect(pickLocalized(backend5, 'zh')).toBe('银行转账');
    expect(pickLocalized(backend5, 'tet')).toBe('Transferénsia bank');
    expect(pickLocalized(backend5, 'pt')).toBe('Transferência bancária');
    // 全键非空时 id 键永不泄漏为输出值
    for (const locale of SUPPORTED_LOCALES) {
      expect(pickLocalized(backend5, locale).length).toBeGreaterThan(0);
      expect(pickLocalized(backend5, locale)).not.toBe('Transferensi bank');
    }
  });
});

describe('toIntlLocale', () => {
  it('语言码映射（client utils/format.ts 原语义）', () => {
    expect(toIntlLocale('zh')).toBe('zh-CN');
    expect(toIntlLocale('pt')).toBe('pt');
    expect(toIntlLocale('id')).toBe('id');
    expect(toIntlLocale('tet')).toBe('en-US');
    expect(toIntlLocale('en')).toBe('en-US');
  });

  it('带地区码取基础码同样命中', () => {
    expect(toIntlLocale('zh-Hans')).toBe('zh-CN');
    expect(toIntlLocale('pt-BR')).toBe('pt');
  });
});
