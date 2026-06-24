import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EvidenceExample, EvidenceUpload } from '../../../src/components/camera/SignaturePad';
import { Button } from '../../../src/components/ui';
import { useGoBack } from '../../../src/hooks/useGoBack';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmDelivery } from '../../../src/services/queries/useDelivery';

const doorExampleUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMHfhBvHWt0EecfMzNQjHgZFZdCRkcX5m9k6xbe1n5-EuFhwQzbzaGDpescZFwxD6bwuFdYiDnqr0XjS4F7jp7iHOsTQZsAYXd4v1pQE4cTFZCj8xdbHqm0VafUAXRae7WVXt0tG_RkbJtgmY__0k2-My2H5W_HoUKhk712Vr-w-zh5rwImNXPpXr2gH5MmFWODGepHtni4Ewasgd55Jqoon6xLKPjeix0QJrFE2KSKWYhGbqqX5omVklWn9OoJrLxpxg1G9PLEQ';
const packageExampleUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCKIaAFgN904UuZQyPS-CIO6WA5rJyPR3Kb9_GetDw7gCAox--tq9ZYbenQOj9DPKVlzTAXhoMzo6aPzcSwyrRgyvc0txMXchb9Q0yF0l-F0HuDclzq1gVRXnghARoPCnj-clXMfCtTWltbLzJj4jy7LcA8Evyz9IxE72TfKvDIm47Y9_LnyBovKiA9swd3jHEko3m5HbB3lPWaGP71vYmLRoInHXMThMjqrFnid0BLOlLqFU2mpH2nPDcFNwFVsEkCUCFOWTlaA';

export default function SignConfirmPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const [doorCaptured, setDoorCaptured] = useState(false);
  const [packageCaptured, setPackageCaptured] = useState(false);
  const [doorUri, setDoorUri] = useState('');
  const [packageUri, setPackageUri] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const confirmDelivery = useConfirmDelivery();

  const canSubmit = doorCaptured && packageCaptured && status !== 'processing';

  const handleConfirmDelivery = async () => {
    if (!canSubmit) return;

    setStatus('processing');
    try {
      await confirmDelivery.mutateAsync({
        taskId: id,
        evidence: { doorUri, packageUri },
      });
      setStatus('success');
      setTimeout(() => router.replace('/(main)/tasks?tab=deliveries'), 500);
    } catch {
      setStatus('idle');
      // TODO: Toast 反馈错误
    }
  };

  return (
    <View className="flex-1 bg-[#fff8f7]">
      <View className="h-16 flex-row items-center justify-between bg-[#fff8f7] px-5">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => void goBack()}>
          <Text className="text-2xl text-[#720003]">‹</Text>
        </Pressable>
        <Text className="text-2xl font-bold tracking-tight text-[#720003]">{t('sign.title')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 pb-40 pt-4">
        <View className="flex-row items-start gap-4 rounded-lg bg-[#961813] p-4 shadow-sm">
          <Text className="text-lg font-bold text-white">i</Text>
          <Text className="flex-1 font-semibold leading-5 text-white">{t('sign.alert')}</Text>
        </View>

        <View className="gap-3">
          <Text className="px-1 text-xs font-bold uppercase tracking-widest text-[#59413d]">{t('sign.referenceExamples')}</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <EvidenceExample label={t('sign.doorExample')} uri={doorExampleUri} />
            </View>
            <View className="flex-1">
              <EvidenceExample label={t('sign.packageExample')} uri={packageExampleUri} />
            </View>
          </View>
        </View>

        <View className="gap-6 pt-2">
          <EvidenceUpload
            actionLabel={t('sign.tapPhoto')}
            captured={doorCaptured}
            capturedLabel={t('sign.photoCaptured')}
            required
            title={t('sign.doorNumber')}
            photoUri={doorUri}
            onPress={(uri) => { setDoorCaptured(true); setDoorUri(uri); }}
          />
          <EvidenceUpload
            actionLabel={t('sign.tapPhoto')}
            captured={packageCaptured}
            capturedLabel={t('sign.photoCaptured')}
            required
            title={t('sign.packageImage')}
            photoUri={packageUri}
            onPress={(uri) => { setPackageCaptured(true); setPackageUri(uri); }}
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 gap-2 bg-white px-5 py-4 shadow-lg">
        <Button className={`${canSubmit ? 'bg-[#961813]' : 'bg-[#5d5f5f] opacity-50'}`} onPress={() => void handleConfirmDelivery()}>
          {status === 'processing' ? t('flow.processing') : status === 'success' ? t('sign.success') : t('sign.confirm')}
        </Button>
        <Text className="mx-auto max-w-[280px] text-center text-[11px] leading-5 text-[#59413d] opacity-80">
          {status === 'success' ? t('sign.confirmed') : t('sign.disputeProof')}
        </Text>
      </View>
    </View>
  );
}
