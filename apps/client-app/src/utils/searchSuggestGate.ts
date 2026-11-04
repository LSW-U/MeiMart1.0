/**
 * 搜索联想门槛（单源，2026-11-04 米字不联想 bug 修复）
 *
 * 规则：CJK 表意文字 1 字即联想；拉丁/其他 ≥2 字符。
 * Why: 原门槛 `length >= 2` 用 JS 字符串长度——'米'.length === 1 被误拦（CJK 每字
 *   已是完整语素，后端对单 CJK 字联想质量良好，直查实证：prefix=米 → 米/米饭/米fan）。
 *   门槛本意（C方案 §4.1）是防拉丁单字母噪音（输入 a 联想一屏误命中），不是防中文。
 * 覆盖范围：CJK 统一表意文字基本区 U+4E00-9FFF + 扩展A U+3400-4DBF（本项目
 *   en/zh/pt/id/tet 五语，仅 zh 用到 CJK；假名/谚文无需求，不扩展）。
 */
const CJK_RE = /[㐀-䶿一-鿿]/;

export function shouldSuggest(prefix: string): boolean {
  const t = prefix.trim();
  return t.length > 0 && (CJK_RE.test(t) || t.length >= 2);
}
