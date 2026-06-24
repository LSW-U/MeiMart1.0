import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PhotoCapture } from '../../../src/components/camera/PhotoCapture';
import { SwipeButton } from '../../../src/components/ui';
import { useGoBack } from '../../../src/hooks/useGoBack';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmPickup } from '../../../src/services/queries/useDelivery';

export default function PickupConfirmPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const [captured, setCaptured] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const confirmPickup = useConfirmPickup();
  const processing = confirmPickup.isPending;

  const handleConfirmPickup = async () => {
    if (!captured || processing) return;

    try {
      await confirmPickup.mutateAsync({ taskId: id, evidence: { photoUri } });
      router.replace('/(main)/tasks?tab=pickups');
    } catch {
      // TODO: Toast 反馈错误
    }
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="h-16 flex-row items-center justify-between bg-[#fff8f7] px-5">
        <Pressable className="rounded-full p-2" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#720003]">‹</Text>
        </Pressable>
        <Text className="text-xl font-bold text-[#720003]">{t('pickup.title')}</Text>
        <Pressable className="rounded-full p-2" onPress={() => router.push('/help')}>
          <Text className="text-xl text-[#720003]">?</Text>
        </Pressable>
      </View>

      <View className="bg-[#fff0ee] px-5 py-4">
        <Text className="mb-1 text-center text-xl font-semibold text-[#261816]">{t('pickup.verifyReceipt')}</Text>
        <Text className="text-center text-base text-[#59413d]">
          {t('pickup.instructionPrefix')} <Text className="font-bold text-[#720003]">Order #{id}</Text>
        </Text>
      </View>

      <View className="flex-1 items-center justify-center gap-6 px-5 py-6">
        <PhotoCapture
          captured={captured}
          fileName={t('pickup.fileName')}
          instruction={t('pickup.ensureVisible')}
          readyLabel={t('pickup.ready')}
          retakeConfirmCancel={t('pickup.retakeCancel')}
          retakeConfirmMessage={t('pickup.retakeMessage')}
          retakeConfirmOk={t('pickup.retakeOk')}
          retakeConfirmTitle={t('pickup.retakeTitle')}
          retakeLabel={t('pickup.retake')}
          photoUri={photoUri}
          onCapture={(uri) => { setCaptured(true); setPhotoUri(uri); }}
          onRetake={() => { setCaptured(false); setPhotoUri(''); }}
        />
      </View>

      <View className="bg-[#fff8f7] px-5 py-6">
        <SwipeButton disabled={!captured || processing} onPress={() => void handleConfirmPickup()}>
          {processing ? t('flow.processing') : t('pickup.confirm')}
        </SwipeButton>
        {processing ? <Text className="mt-3 text-center text-sm text-[#59413d]">{t('pickup.verified')}</Text> : null}
      </View>
    </View>
  );
}
