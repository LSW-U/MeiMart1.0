import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { showToast } from '../../../src/components/feedback/Toast';
import { MapView } from '../../../src/components/map/MapView';
import { NavigationLauncher } from '../../../src/components/map/NavigationLauncher';
import { Button } from '../../../src/components/ui';
import { useGoBack } from '../../../src/hooks/useGoBack';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { ApiError } from '../../../src/services/api';
import { useStartDelivering, useTask } from '../../../src/services/queries/useTask';
import type { DeliveryTask } from '../../../src/types/task';

const formatFee = (fee: number, currency: string) => `${currency}${fee.toFixed(2)}`;
const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)} KM`;

export default function TaskNavigatePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const { data } = useTask(id);
  const task: DeliveryTask | null = data ?? null;
  const startDelivering = useStartDelivering();

  // P14 ④ B1 + M1: 守卫按 taskType 理清
  // - delivery: 只允许 PICKED_UP（两步跳过 DELIVERING）
  // - return: 允许 PICKED_UP（开始配送前）+ DELIVERING（已开始配送，去签收）
  // Why: navigate 是取货后导航送货；其他状态弹回详情页
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
    <View className="flex-1 bg-[#fff8f7]">
      <View className="h-16 flex-row items-center justify-between bg-[#ffe9e6] px-5">
        <View className="flex-row items-center gap-4">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full" onPress={() => void goBack()}>
            <Text className="text-2xl text-[#720003]">‹</Text>
          </Pressable>
          <Text className="text-xl font-bold text-[#720003]">{t('flow.orderDetails')}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('flow.status')}</Text>
          <View className="h-2 w-2 rounded-full bg-[#463200]" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-32">
        {task ? (
          <>
            <MapView
              pickup={task.pickup.coordinates ? { ...task.pickup.coordinates, title: task.pickup.title } : undefined}
              delivery={task.dropoff.coordinates ? { ...task.dropoff.coordinates, title: task.dropoff.title } : undefined}
            />
            <View className="-mt-8 gap-4 px-5">
              <View className="rounded-xl border border-[#8d706c]/10 bg-white p-4 shadow-md">
                <View className="mb-6 flex-row items-start justify-between">
                  <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('flow.remainingTime')}</Text>
                    <View className="flex-row items-end gap-2">
                      <Text className="text-xl font-semibold text-[#720003]">{t('common.minutes', { minutes: String(task.estimatedMinutes) })}</Text>
                      <Text className="text-sm text-[#59413d]">{t('common.deliveryRoute')}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('flow.totalEarnings')}</Text>
                    <Text className="text-2xl font-bold text-[#720003]">{formatFee(task.fee, t('common.currency'))}</Text>
                    <Text className="text-[10px] text-[#8d706c]">{task.orderId}</Text>
                  </View>
                </View>

                <View className="relative gap-6">
                  <View className="absolute bottom-8 left-[15px] top-8 w-0.5 border-l border-dotted border-[#8d706c] bg-[#e1bfba]" />
                  <View className="z-10 flex-row gap-4">
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-[#e1bfba] bg-[#fde2df]">
                      <Text className="font-bold text-[#720003]">P</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold leading-tight text-[#261816]">{task.pickup.title}</Text>
                      <Text className="mt-1 text-sm text-[#59413d]">{task.pickup.address}</Text>
                      <Text className="mt-2 self-start rounded-lg bg-[#ffe9e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#59413d]">{t('flow.storePickup')}</Text>
                    </View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-[#8d706c]">{formatDistance(Math.max(task.distanceKm - 1.3, 0.5))}</Text>
                  </View>
                  <View className="z-10 flex-row gap-4">
                    <View className="h-8 w-8 items-center justify-center rounded-full border border-[#463200] bg-[#634700]">
                      <Text className="font-bold text-white">D</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold leading-tight text-[#261816]">{task.dropoff.title}</Text>
                      <Text className="mt-1 text-sm text-[#59413d]">{task.dropoff.address}</Text>
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <Text className="rounded-full border border-[#e1bfba] bg-[#ffe9e6] px-2 py-1 text-[10px] font-bold text-[#59413d]">{t('flow.verifiedReceiver')}</Text>
                        <Text className="rounded-full border border-[#e1bfba] bg-[#ffe9e6] px-2 py-1 text-[10px] font-bold text-[#59413d]">{t('flow.leaveAtDoor')}</Text>
                      </View>
                    </View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-[#8d706c]">{formatDistance(task.distanceKm)}</Text>
                  </View>
                </View>

                <View className="my-6 h-px bg-[#e1bfba]/30" />
                <View className="rounded-lg px-2 py-2">
                  <Text className="font-bold text-[#261816]">{t('common.orderSummary', { count: String(task.items.length) })}</Text>
                  <View className="mt-4 gap-3 px-6">
                    {task.items.map((item) => (
                      <View className="flex-row justify-between" key={item}>
                        <Text className="flex-1 text-sm text-[#59413d]">{item}</Text>
                        <Text className="font-bold text-[#261816]">{t('flow.qty1')}</Text>
                      </View>
                    ))}
                    {task.note ? (
                      <View className="mt-2 rounded-lg border-l-4 border-[#720003] bg-[#fff8f7] p-3">
                        <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#720003]">{t('flow.customerNote')}</Text>
                        <Text className="text-sm italic text-[#261816]">{task.note}</Text>
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

      <View className="absolute bottom-0 left-0 right-0 bg-[#fff8f7] p-5 shadow-lg">
        <Button className="bg-[#463200]" onPress={() => void handleNavigateAction()}>
          {startDelivering.isPending ? t('flow.processing') : actionLabel}
        </Button>
      </View>
    </View>
  );
}
