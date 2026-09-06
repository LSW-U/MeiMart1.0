import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '../../i18n/useTranslation';

type NewOrderAlertProps = {
  title: string;
  onPress?: () => void;
};

export function NewOrderAlert({ title, onPress }: NewOrderAlertProps) {
  const { t } = useTranslation();
  return (
    <Pressable className="rounded-3xl bg-primary p-4" onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-white">{title}</Text>
        <Text className="text-sm font-semibold text-surface-container">{t('common.view')}</Text>
      </View>
    </Pressable>
  );
}
