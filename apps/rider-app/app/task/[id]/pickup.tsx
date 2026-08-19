import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { EvidenceUpload } from '../../../src/components/camera/SignaturePad';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { QueryBoundary } from '../../../src/components/feedback/QueryBoundary';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';
import { SwipeButton } from '../../../src/components/ui';
import { useNetwork } from '../../../src/hooks/useNetwork';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useConfirmPickup } from '../../../src/services/queries/useDelivery';
import { useTask } from '../../../src/services/queries/useTask';
import type { DeliveryTask } from '../../../src/types/task';

export default function PickupConfirmPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [captured, setCaptured] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const confirmPickup = useConfirmPickup();
  const { isOffline } = useNetwork();
  const processing = confirmPickup.isPending;
  // T3 §3.1: 三态接入（B3）——loading 骨架 / error 重试 / null 才是任务不存在
  const { data: task, isLoading, isError, refetch } = useTask(id);
  const taskOrNull = task ?? null;

  // Why: pickup 页只允许 ASSIGNED 进入。已取货任务应跳走：
  //   PICKED_UP → navigate（去配送）；DELIVERING → sign（对齐 deliveries tab 直跳签收，审查 A3）；
  //   其他状态弹回 detail。防止对已取货 task 重复取货 409（2d43ec05 实证）。
  //   守卫基于 useTask 缓存状态（S3），极端竞态下仍可能 409，由提交 toast 兜底（审查 A4）。
  //   T3 §7.1 拍板 A：守卫读 taskOrNull（loading 期 task=undefined→null→守卫 return，数据到达 re-run）
  useEffect(() => {
    if (!taskOrNull || taskOrNull.status === 'ASSIGNED') return;
    router.replace(
      taskOrNull.status === 'PICKED_UP'
        ? `/task/${id}/navigate`
        : taskOrNull.status === 'DELIVERING'
          ? `/task/${id}/sign`
          : `/task/${id}`,
    );
  }, [taskOrNull, id, router]);

  const handleConfirmPickup = async () => {
    if (!captured || processing) return;

    try {
      await confirmPickup.mutateAsync({ taskId: id, evidence: { photoUri } });
      // CLAUDE.md 规则 12：离线入队成功提示（mutationFn resolve 不 reject，调用方按 isOffline 区分）
      // T3 §7.2 拍板 A：成功反馈补位（原仅离线 toast，在线成功直接跳转无反馈）
      if (isOffline) showToast(t('common.savedOffline'), 'info');
      else showToast(t('pickup.verified'), 'success');
      router.replace('/(main)/tasks?tab=pickups');
    } catch (e) {
      // 审查报告 TODO toast：按 ApiError 差异化（业务失败 vs 网络）
      const msg = e instanceof ApiError ? t('pickup.failed') : t('common.networkError');
      showToast(msg, 'error');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StepPageHeader
        actionLabel={t('help.title')}
        backLabel={t('common.back')}
        title={t('pickup.title')}
        onAction={() => router.push('/help')}
      />

      {/* T3 §3.2: 订单号用 task.orderId（后端真实订单号），原路由 id（内部 UUID）冒充错误；
          loading 期无 task 不渲染编号区，由下方骨架承载整页三态 */}
      {taskOrNull ? (
        <View className="bg-surface-container-low px-5 py-4">
          <Text className="mb-1 text-center text-xl font-semibold text-on-surface">{t('pickup.verifyReceipt')}</Text>
          <Text className="text-center text-base text-on-surface-variant">
            {t('pickup.instructionPrefix')}{' '}
            <Text className="font-bold text-primary">{t('pickup.orderLabel', { order: taskOrNull.orderId })}</Text>
          </Text>
        </View>
      ) : null}

      {/* T3 §3.1: 三态边界——弱网/断网不再"照常可拍照提交"；SwipeButton 留边界外
          （loading 时 captured=false 已禁用，安全） */}
      <View className="flex-1 justify-center px-5 py-6">
        <QueryBoundary<DeliveryTask | null>
          data={task}
          isLoading={isLoading}
          isError={isError}
          isEmpty={(d) => d === null}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('pickup.notFound')}
          emptyDescription={t('pickup.notFoundDesc')}
          skeleton="detail"
          onRetry={() => void refetch()}
        >
          {(detail) => (
            <View className="gap-4">
              <EvidenceUpload
                actionLabel={t('pickup.tapPhoto')}
                captured={captured}
                capturedLabel={t('pickup.capturedLabel')}
                required
                title={t('pickup.verifyReceipt')}
                photoUri={photoUri}
                onPermissionDenied={() => showToast(t('pickup.cameraPermissionDenied'), 'error')}
                onError={() => showToast(t('pickup.cameraError'), 'error')}
                onPress={(uri) => { setCaptured(true); setPhotoUri(uri); }}
              />
              {/* 取证提示（原 PhotoCapture 的 instruction，统一视觉后保留为说明文字） */}
              <Text className="text-center text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                {t('pickup.ensureVisible')}
              </Text>
            </View>
          )}
        </QueryBoundary>
      </View>

      <View className="bg-surface px-5 py-6">
        {/* T3 §7.2 拍板 A：processing 文案行删除（Button 已表达），原 pickup.verified
            （"订单 #102 已核对"语义错位 + #102 硬编码）改为上方成功 toast */}
        <SwipeButton disabled={!captured || processing} onPress={() => void handleConfirmPickup()}>
          {processing ? t('flow.processing') : t('pickup.confirm')}
        </SwipeButton>
      </View>
    </View>
  );
}
