import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PhotoCapture } from '../../../src/components/camera/PhotoCapture';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';
import { SwipeButton } from '../../../src/components/ui';
import { useNetwork } from '../../../src/hooks/useNetwork';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmPickup } from '../../../src/services/queries/useDelivery';
import { useTask } from '../../../src/services/queries/useTask';

export default function PickupConfirmPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const confirmPickup = useConfirmPickup();
  const { isOffline } = useNetwork();
  const processing = confirmPickup.isPending;
  const { data: task } = useTask(id);

  // Why: pickup 页只允许 ASSIGNED 进入。已取货任务应跳走：
  //   PICKED_UP → navigate（去配送）；DELIVERING → sign（对齐 deliveries tab 直跳签收，审查 A3）；
  //   其他状态弹回 detail。防止对已取货 task 重复取货 409（2d43ec05 实证）。
  //   守卫基于 useTask 缓存状态（S3），极端竞态下仍可能 409，由提交 toast 兜底（审查 A4）。
  useEffect(() => {
    if (!task || task.status === 'ASSIGNED') return;
    router.replace(
      task.status === 'PICKED_UP'
        ? `/task/${id}/navigate`
        : task.status === 'DELIVERING'
          ? `/task/${id}/sign`
          : `/task/${id}`,
    );
  }, [task, id, router]);

  const handleConfirmPickup = async () => {
    if (!captured || processing) return;

    try {
      await confirmPickup.mutateAsync({ taskId: id, evidence: { photoUri } });
      // CLAUDE.md 规则 12：离线入队成功提示（mutationFn resolve 不 reject，调用方按 isOffline 区分）
      if (isOffline) showToast(t('common.savedOffline'), 'info');
      router.replace('/(main)/tasks?tab=pickups');
    } catch (e) {
      // 审查报告 TODO toast：按 ApiError 差异化（业务失败 vs 网络）
      const msg = e instanceof ApiError ? t('pickup.failed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  return (
    <View className="flex-1 bg-surface">
      <StepPageHeader
        actionLabel={t('help.title')}
        backLabel={t('common.back')}
        title={t('pickup.title')}
        onAction={() => router.push('/help')}
      />

      <View className="bg-surface-container-low px-5 py-4">
        <Text className="mb-1 text-center text-xl font-semibold text-on-surface">{t('pickup.verifyReceipt')}</Text>
        <Text className="text-center text-base text-on-surface-variant">
          {t('pickup.instructionPrefix')} <Text className="font-bold text-primary">Order #{id}</Text>
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

      <View className="bg-surface px-5 py-6">
        <SwipeButton disabled={!captured || processing} onPress={() => void handleConfirmPickup()}>
          {processing ? t('flow.processing') : t('pickup.confirm')}
        </SwipeButton>
        {processing ? <Text className="mt-3 text-center text-sm text-on-surface-variant">{t('pickup.verified')}</Text> : null}
      </View>
    </View>
  );
}
