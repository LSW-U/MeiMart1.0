/**
 * @meimart/i18n-core — MeiMart1.0 client/rider 共享 i18n 取值核心（跨端基建统一 批1，2026-10-01）
 *
 * 单源共享：client-app + rider-app 共用「多语言 Record → 当前语言文本」的取值语义；
 * 两 app 各自注入运行时 locale 事实源（本包禁读 localStorage/AsyncStorage —— 端侧存储
 * 形态不同，注入模式参照 upload-core 边界）：
 *   - client 注入 i18next 运行时（i18n/index.ts setLocaleRuntime）
 *   - rider 注入 settings.getCurrentLanguage
 *
 * 导出：
 *   - setLocaleRuntime / getLocaleRuntime  运行时事实源注入与读取
 *   - pickLocalized(text, locale, fallback) 显式 locale 取值（回退链 locale→en→zh→首值→fallback）
 *   - localize(text, fallback?)            走运行时 locale 的便捷封装（渲染层/调用方单参调用）
 *   - currentLocale()                      运行时 locale（未注入时回退 'en'）
 *   - toIntlLocale(locale)                 UI 语言码 → Intl locale 标签（tet→en-US 回退）
 *   - Locale / SUPPORTED_LOCALES           locale 类型与值列表
 *
 * 键集收敛能力（payment.ts toLocalizable 评估用，M6）：pickLocalized 只在「当前语言无值」时
 * 沿回退链取值，'id' 等前端未支持语言的键永远不会被 优先选中（仅在四语全缺时才可能被
 * 「首个值」兜底命中），即键集收敛语义已由回退链天然覆盖。
 */

export type Locale = 'zh' | 'en' | 'tet' | 'pt';

export const SUPPORTED_LOCALES: readonly Locale[] = ['zh', 'en', 'tet', 'pt'];

/** 多语言文本：后端 5 语 JSON Record 宽松透传（多余键由回退链兜底）+ 纯文本串直通（mock/后端降级返回单串时原样展示，调用方不做类型收窄也可安全消费） */
export type LocalizedText = string | Record<string, string> | null | undefined;

/** 运行时 locale 事实源（端侧注入；返回值须是 Locale） */
export type LocaleRuntime = () => Locale;

let localeRuntime: LocaleRuntime | null = null;

/** 端侧注入运行时事实源（app 启动时调用一次；重复注入以后者为准） */
export function setLocaleRuntime(runtime: LocaleRuntime): void {
  localeRuntime = runtime;
}

/** 供测试复位注入（生产代码勿用） */
export function resetLocaleRuntime(): void {
  localeRuntime = null;
}

/** 当前运行时 locale；未注入（或注入函数抛错）时回退 'en'。
 * 注：rider 的 AppLanguage 含 'id'（后端 5 语）——注入值信任事实源直通回退链（不白名单裁剪），
 * 'id' 不在四语回退链内，经「首个值」兜底语义正确命中 id 键。 */
export function currentLocale(): Locale {
  if (localeRuntime) {
    try {
      return localeRuntime();
    } catch {
      // 注入函数运行期异常按未注入处理，走默认值
    }
  }
  return 'en';
}

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 显式 locale 取值（单源语义，取代两端各自的 pickLocalized 本地实现）。
 * 回退链：locale → en → zh → 首个值 → fallback。
 * 纯字符串入参原样返回（mock/后端降级单串场景，原 orders 版 unknown 分支语义）；其余非 Record 返回 fallback。
 */
export function pickLocalized(text: LocalizedText, locale: Locale, fallback = ''): string {
  if (typeof text === 'string') return text.length > 0 ? text : fallback;
  if (!isRecord(text)) return fallback;
  const chain = [locale, 'en', 'zh'];
  for (const key of chain) {
    const v = text[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  const first = Object.values(text).find((v) => typeof v === 'string' && v.length > 0);
  return first ?? fallback;
}

/** 走运行时 locale 的取值封装（渲染层/调用方默认入口） */
export function localize(text: LocalizedText, fallback = ''): string {
  return pickLocalized(text, currentLocale(), fallback);
}

/**
 * UI 语言码 → Intl locale 标签（client utils/format.ts 既有实现上收，语言优化方案 v2 §2.5）。
 * Why: Intl 不认识 Tetum，tet 回退 en-US；取基础码（带地区码同样命中）。
 */
export function toIntlLocale(locale: string): string {
  const base = locale.split('-')[0];
  switch (base) {
    case 'zh':
      return 'zh-CN';
    case 'pt':
      return 'pt';
    case 'id':
      return 'id';
    default:
      return 'en-US';
  }
}
