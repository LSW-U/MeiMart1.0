import { useEffect, useState } from 'react';

import { getRiderSettings, subscribeRiderSettings, type AppLanguage } from '../services/settings';
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

type TranslationKey = keyof typeof en;

export function useTranslation() {
  const [language, setLanguage] = useState<AppLanguage>('zh');

  useEffect(() => {
    void getRiderSettings().then((settings) => setLanguage(settings.language));
    return subscribeRiderSettings((settings) => setLanguage(settings.language));
  }, []);

  const t = (key: TranslationKey) => dictionaries[language][key] || dictionaries.en[key] || key;

  return { t, language };
}
