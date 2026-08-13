import type { ReactNode } from 'react';
import { Modal as NativeModal, Pressable, Text, View } from 'react-native';

import { useTranslation } from '../../i18n/useTranslation';

type ModalProps = {
  visible: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ visible, title, children, onClose }: ModalProps) {
  const { t } = useTranslation();
  return (
    <NativeModal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/40 px-6">
        <View className="rounded-3xl bg-white p-5">
          {title ? <Text className="mb-4 text-lg font-bold text-on-surface">{title}</Text> : null}
          {children}
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} className="mt-5 rounded-full bg-primary py-3" onPress={onClose}>
            <Text className="text-center font-semibold text-white">{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </NativeModal>
  );
}
