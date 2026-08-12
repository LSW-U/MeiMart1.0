import { Text, View } from 'react-native';

import { useNetwork } from '../../hooks/useNetwork';
import { useTranslation } from '../../i18n/useTranslation';

export function OfflineBanner() {
  const { isOffline } = useNetwork();
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <View className="bg-primary-container px-4 py-2">
      <Text className="text-center text-sm font-semibold text-white">{t('common.offlineTitle')}</Text>
    </View>
  );
}
