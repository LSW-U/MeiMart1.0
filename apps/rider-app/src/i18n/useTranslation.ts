import type { AppLanguage } from '../services/settings';
import { useLanguageContext } from './LanguageContext';
import en from './locales/en.json';
import id from './locales/id.json';
import pt from './locales/pt.json';
import tet from './locales/tet.json';
import zh from './locales/zh.json';

const dictionaries: Record<AppLanguage, typeof en> = {
  zh,
  en,
  tet,
  pt,
  id,
};

export type TranslationKey = keyof typeof en;
export type TranslationVars = Record<string, string | number>;

const interpolate = (template: string, vars?: TranslationVars) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
};

// A4：服务层（notification vars 等 hook 外场景）用的纯函数翻译——
// 与 hook 同一套字典 + 回退规则（当前语言 → en → key）
export function translate(
  language: AppLanguage,
  key: TranslationKey,
  vars?: TranslationVars,
): string {
  const template = dictionaries[language][key] || dictionaries.en[key] || key;
  return interpolate(template, vars);
}

// C14（R-P2-14）：language 改走 Context——不再订阅 useRiderSettings（settings query
//   invalidate 时 35 个文案组件全量重渲染）。language 写点在 LanguageProvider（设置页
//   经 useUpdateRiderSettings 成功后调 setLanguage）。
export function useTranslation() {
  const { language } = useLanguageContext();

  const t = (key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars);

  return { t, language };
}
