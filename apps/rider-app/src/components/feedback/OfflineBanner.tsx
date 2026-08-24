import { Text, View } from 'react-native';

import { useNetworkStore } from '../../hooks/useNetworkStore';
import { useTranslation } from '../../i18n/useTranslation';

export function OfflineBanner() {
  // P6-5（Q3=B）：切单例 store——与 _layout MainContent 共享同一份网络状态。
  const isOffline = useNetworkStore((s) => s.isOffline);
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <View className="bg-primary-container px-4 py-2">
      <Text className="text-center text-sm font-semibold text-white">{t('common.offlineTitle')}</Text>
    </View>
  );
}
