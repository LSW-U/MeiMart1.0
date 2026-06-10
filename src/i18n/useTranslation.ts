import en from './locales/en.json';

const dictionaries = {
  en,
};

type TranslationKey = keyof typeof en;

export function useTranslation() {
  const t = (key: TranslationKey) => dictionaries.en[key] || key;

  return { t };
}
