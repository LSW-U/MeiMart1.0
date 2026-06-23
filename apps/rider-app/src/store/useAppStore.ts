import { create } from 'zustand';

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
    try {
      await setCurrentLanguage(locale);
      set({ locale });
    } catch (e) {
      console.error('[useAppStore] setLocale failed:', e);
    }
  },

  hydrate: async () => {
    try {
      const lang = await getCurrentLanguage();
      set({ locale: lang });
      subscribeRiderSettings((settings) => {
        set({ locale: settings.language });
      });
    } catch (e) {
      console.error('[useAppStore] hydrate failed:', e);
    }
  },
}));

export type { AppLanguage };
