import { useRiderSettings } from '../services/queries/useSettings';
import type { AppLanguage } from '../services/settings';
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
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
};

// A4：服务层（notification vars 等 hook 外场景）用的纯函数翻译——
// 与 hook 同一套字典 + 回退规则（当前语言 → en → key）
export function translate(language: AppLanguage, key: TranslationKey, vars?: TranslationVars): string {
  const template = dictionaries[language][key] || dictionaries.en[key] || key;
  return interpolate(template, vars);
}

export function useTranslation() {
  const { data: settings } = useRiderSettings();
  const language: AppLanguage = settings?.language ?? 'zh';

  const t = (key: TranslationKey, vars?: TranslationVars) => translate(language, key, vars);

  return { t, language };
}
