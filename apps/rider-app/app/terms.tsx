import { LegalPage } from '../src/components/layout/LegalPage';
import { useTranslation } from '../src/i18n/useTranslation';

export default function TermsPage() {
  const { t } = useTranslation();
  return (
    <LegalPage
      bodyKey="legal.terms.body"
      icon="document"
      backLabel={t('common.back')}
      titleKey="legal.terms.title"
      versionKey="legal.terms.version"
    />
  );
}
