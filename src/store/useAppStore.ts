import { create } from 'zustand';

import type { Locale } from '../types/common';
import { getCurrentLanguage, setCurrentLanguage, subscribeRiderSettings, type AppLanguage } from '../services/settings';

type AppState = {
  locale: AppLanguage;
  theme: 'light';
  setLocale: (locale: AppLanguage) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  locale: 'zh',
  theme: 'light',

  setLocale: async (locale: AppLanguage) => {
    await setCurrentLanguage(locale);
    set({ locale });
  },

  hydrate: async () => {
    const lang = await getCurrentLanguage();
    set({ locale: lang });
    subscribeRiderSettings((settings) => {
      set({ locale: settings.language });
    });
  },
}));
