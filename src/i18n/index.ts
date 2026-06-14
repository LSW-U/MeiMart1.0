import i18n, { use as registerI18nModule, changeLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '@/store/appStore';

import zh from '../../locales/zh.json';
import en from '../../locales/en.json';
import tet from '../../locales/tet.json';

export const SUPPORTED_LOCALES = ['zh', 'en', 'tet'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'zh';

const LOCALE_STORAGE_KEY = 'meimart.locale';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
  tet: { translation: tet },
} as const;

async function loadInitialLocale(): Promise<AppLocale> {
  const persisted = useAppStore.getState().locale as AppLocale;
  if (SUPPORTED_LOCALES.includes(persisted)) return persisted;
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as AppLocale)) {
      return stored as AppLocale;
    }
  } catch {
    // fallthrough to device locale
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

export default i18n;
