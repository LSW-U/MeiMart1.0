import { LegalPage } from '../src/components/layout/LegalPage';
import { useTranslation } from '../src/i18n/useTranslation';

export default function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <LegalPage
      bodyKey="legal.privacy.body"
      icon="shield"
      backLabel={t('common.back')}
      titleKey="legal.privacy.title"
      versionKey="legal.privacy.version"
    />
  );
}
