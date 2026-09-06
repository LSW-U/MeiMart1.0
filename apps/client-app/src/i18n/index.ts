import i18n, { use as registerI18nModule, changeLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { useAppStore } from '@/store/appStore';
import type { LocalizableText } from '@/types';

import zh from '../../locales/zh.json';
import en from '../../locales/en.json';
import tet from '../../locales/tet.json';
import pt from '../../locales/pt.json';

export const SUPPORTED_LOCALES = ['zh', 'en', 'tet', 'pt'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';

const LOCALE_STORAGE_KEY = 'meimart.locale';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  tet: { translation: tet },
  pt: { translation: pt },
} as const;

/**
 * 单一语言注册表（语言优化方案 v2 Q5/Q2：语言列表配置驱动，加语言=加一项）。
 * Why: 原 3 处注册点（此处 SUPPORTED_LOCALES + language.tsx LANGUAGES + LocaleBar LOCALE_DISPLAY）
 *      在 pt 接入时要改 3 遍，收敛到此处单一导出，消费方只渲染 enabled 项。
 */
export interface LanguageOption {
  code: AppLocale;
  /** 列表主标题（语言页 label / LocaleBar 链接文字，原生语言呈现） */
  label: string;
  /** 原生语言名（语言页副标题 + a11y label） */
  native: string;
  /** 翻译达标才启用（Q5：翻译达标一个开一个；未启用项不出现在语言页 / LocaleBar） */
  enabled: boolean;
}

export const LANGUAGE_REGISTRY: LanguageOption[] = [
  { code: 'zh', label: '中文', native: '中文（简体）', enabled: true },
  { code: 'en', label: 'English', native: 'English', enabled: true },
  { code: 'tet', label: 'Tetun', native: 'Tetun', enabled: true },
  // Why: pt 本批全量真译完成（key 与 en 对齐、未译率 0），达标即启用
  { code: 'pt', label: 'Português', native: 'Português', enabled: true },
];

/** 启用中的语言（语言页 / LocaleBar 渲染来源） */
export const ENABLED_LANGUAGES = LANGUAGE_REGISTRY.filter((l) => l.enabled);

async function loadInitialLocale(): Promise<AppLocale> {
  // Why: 优先从 AsyncStorage 读取用户主动选择的语言
  // appStore 的 locale 是 zustand persist 异步恢复，可能在 initI18n 执行时还未恢复
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as AppLocale)) {
      return stored as AppLocale;
    }
  } catch {
    // fallthrough to appStore
  }
  const persisted = useAppStore.getState().locale as AppLocale;
  if (SUPPORTED_LOCALES.includes(persisted) && persisted !== 'en') {
    // Why: appStore 默认值是 'en'，如果还是 'en' 说明未恢复或未选择，跳过用设备语言
    return persisted;
  }
  const device = getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  if (SUPPORTED_LOCALES.includes(device as AppLocale)) return device as AppLocale;
  return DEFAULT_LOCALE;
}

let initialized = false;

export async function initI18n() {
  if (initialized) return i18n;
  initialized = true;
  const initial = await loadInitialLocale();
  await registerI18nModule(initReactI18next).init({
    resources,
    lng: initial,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18n;
}

export async function changeLocale(locale: AppLocale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  useAppStore.getState().setLocale(locale);
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore storage errors
  }
  await changeLanguage(locale);
}

export function getCurrentLocale(): AppLocale {
  return (i18n.language as AppLocale) ?? DEFAULT_LOCALE;
}

export function isRTL(locale: string): boolean {
  return ['ar', 'he', 'fa', 'ur'].includes(locale);
}

export function localize(text: LocalizableText, locale: AppLocale): string {
  return text[locale] ?? text.en;
}

export function useLocalizer(): (text: LocalizableText) => string {
  const locale = useLocale();
  return (text) => localize(text, locale);
}

// Why: 语言变化需响应式参与的场景（queryKey 入 locale 等）——i18n.language 本身非响应式，
//      useSyncExternalStore 订阅 languageChanged 保证切语言即重渲染（catalog 换语言缓存 bug 修复依赖此）
export function useLocale(): AppLocale {
  return useSyncExternalStore(
    (cb) => {
      const handler = () => cb();
      i18n.on('languageChanged', handler);
      return () => {
        i18n.off('languageChanged', handler);
      };
    },
    () => (i18n.language as AppLocale) || DEFAULT_LOCALE,
    () => DEFAULT_LOCALE,
  );
}

export default i18n;
