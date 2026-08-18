import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { showToast } from '../../../src/components/feedback/Toast';
import { MapView } from '../../../src/components/map/MapView';
import { NavigationLauncher } from '../../../src/components/map/NavigationLauncher';
import { Button } from '../../../src/components/ui';
import { AppIcon } from '../../../src/components/ui/AppIcon';
import { colors } from '../../../src/theme/colors';
import { useNetwork } from '../../../src/hooks/useNetwork';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { ApiError } from '../../../src/services/api';
import { useStartDelivering, useTask } from '../../../src/services/queries/useTask';
import type { DeliveryTask } from '../../../src/types/task';
import { formatCurrency, formatDistance } from '../../../src/utils/format';
import { pickupDistance } from '../../../src/utils/distance';


export default function TaskNavigatePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data } = useTask(id);
  const task: DeliveryTask | null = data ?? null;
  const startDelivering = useStartDelivering();
  const { isOffline } = useNetwork();

  // P14 ④ B1 + M1: 守卫按 taskType 理清
  // - delivery: 只允许 PICKED_UP（两步跳过 DELIVERING）
  // - return: 允许 PICKED_UP（开始配送前）+ DELIVERING（已开始配送，去签收）
  // Why: navigate 是取货后导航送货；其他状态弹回详情页
  // 基于缓存：守卫读 useTask 缓存（S3），极端竞态下仍可能 409，由提交 toast 兜底（审查 A4）
  useEffect(() => {
    if (!task) return;
    const isReturn = task.taskType === 'return';
    const allowed = isReturn
      ? task.status === 'PICKED_UP' || task.status === 'DELIVERING'
      : task.status === 'PICKED_UP';
    if (!allowed) {
      router.replace(`/task/${id}`);
    }
  }, [task, id, router]);

  // B1: return 任务 PICKED_UP 先 startDelivering 进 DELIVERING，再跳 sign
  // delivery 任务 + return 的 DELIVERING：直接跳 sign
  const handleNavigateAction = async () => {
    if (!task) return;
    // S5: 防重复点击（startDelivering in-flight 期间禁用）
    if (startDelivering.isPending) return;
    if (task.taskType === 'return' && task.status === 'PICKED_UP') {
      try {
        await startDelivering.mutateAsync(id);
        if (isOffline) showToast(t('common.savedOffline'), 'info');
      } catch (e) {
        // S6: 按 ApiError 差异化（return 任务 startDelivering 失败）
        const msg = e instanceof ApiError ? t('tasks.startDeliveringFailed') : t('common.networkError');
        showToast(msg, 'error');
        return; // 失败不跳 sign，留在 navigate 页
      }
    }
    router.push(`/task/${id}/sign`);
  };

  // return + PICKED_UP: 显示"开始配送"；其他（delivery + PICKED_UP / return + DELIVERING）: 显示"去签收"
  const actionLabel =
    task?.taskType === 'return' && task?.status === 'PICKED_UP'
      ? t('tasks.startDelivery')
      : t('tasks.goSignoff');

  return (
    <View className="flex-1 bg-background">
      {/* B4: 统一页头（背景 bg-surface-container → bg-surface）；假 STATUS 点不迁入（T4 处理） */}
      <StepPageHeader backLabel={t('common.back')} title={t('flow.orderDetails')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-32">
        {task ? (
          <>
            <MapView
              pickup={task.pickup.coordinates ? { ...task.pickup.coordinates, title: task.pickup.title } : undefined}
              delivery={task.dropoff.coordinates ? { ...task.dropoff.coordinates, title: task.dropoff.title } : undefined}
            />
            <View className="-mt-8 gap-4 px-5">
              <View className="rounded-xl border border-outline/10 bg-surface p-4 shadow-md">
                <View className="mb-6 flex-row items-start justify-between">
                  <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('flow.remainingTime')}</Text>
                    <View className="flex-row items-end gap-2">
                      <Text className="text-xl font-semibold text-primary">{t('common.minutes', { minutes: String(task.estimatedMinutes) })}</Text>
                      <Text className="text-sm text-on-surface-variant">{t('common.deliveryRoute')}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{t('flow.totalEarnings')}</Text>
                    <Text className="text-2xl font-bold text-primary">{formatCurrency(task.fee, t('common.currency'))}</Text>
                    <Text className="text-[10px] text-outline">{task.orderId}</Text>
                  </View>
                </View>

                <View className="relative gap-6">
                  <View className="absolute bottom-8 left-[15px] top-8 w-0.5 border-l border-dotted border-outline bg-outline-variant" />
                  <View className="z-10 flex-row gap-4">
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high">
                      <AppIcon className="text-primary" name="pickup" size={18} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold leading-tight text-on-surface">{task.pickup.title}</Text>
                      <Text className="mt-1 text-sm text-on-surface-variant">{task.pickup.address}</Text>
                      <Text className="mt-2 self-start rounded-lg bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('flow.storePickup')}</Text>
                    </View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-outline">{formatDistance(pickupDistance(task.distanceKm))}</Text>
                  </View>
                  <View className="z-10 flex-row gap-4">
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-tertiary bg-tertiary-container">
                      <AppIcon color={colors.surface} name="dropoff" size={18} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold leading-tight text-on-surface">{task.dropoff.title}</Text>
                      <Text className="mt-1 text-sm text-on-surface-variant">{task.dropoff.address}</Text>
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <Text className="rounded-full border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-bold text-on-surface-variant">{t('flow.verifiedReceiver')}</Text>
                        <Text className="rounded-full border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-bold text-on-surface-variant">{t('flow.leaveAtDoor')}</Text>
                      </View>
                    </View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-outline">{formatDistance(task.distanceKm)}</Text>
                  </View>
                </View>

                <View className="my-6 h-px bg-outline-variant/30" />
                <View className="rounded-lg px-2 py-2">
                  <Text className="font-bold text-on-surface">{t('common.orderSummary', { count: String(task.items.length) })}</Text>
                  <View className="mt-4 gap-3 px-6">
                    {task.items.map((item) => (
                      <View className="flex-row justify-between" key={item}>
                        <Text className="flex-1 text-sm text-on-surface-variant">{item}</Text>
                        <Text className="font-bold text-on-surface">{t('flow.qty1')}</Text>
                      </View>
                    ))}
                    {task.note ? (
                      <View className="mt-2 rounded-lg border-l-4 border-primary bg-surface p-3">
                        <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">{t('flow.customerNote')}</Text>
                        <Text className="text-sm italic text-on-surface">{task.note}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {task.dropoff.coordinates && (
                <NavigationLauncher destination={task.dropoff.coordinates} label={t('tasks.openNavigation')} />
              )}
            </View>
          </>
        ) : (
          <View className="px-5 pt-8">
            <EmptyState title={t('common.taskNotFound')} description={t('common.routeNotFound')} />
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-surface p-5 shadow-lg">
        <Button className="bg-tertiary" disabled={!task || startDelivering.isPending} loading={startDelivering.isPending} onPress={() => void handleNavigateAction()}>
          {startDelivering.isPending ? t('flow.processing') : actionLabel}
        </Button>
      </View>
    </View>
  );
}
