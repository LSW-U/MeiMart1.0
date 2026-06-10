import type { Locale } from '@/src/types/common';

export function useAppStore() {
  return {
    locale: 'en' as Locale,
    theme: 'light' as const,
    setLocale: (_locale: Locale) => undefined,
  };
}
