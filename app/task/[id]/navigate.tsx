import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../../src/components/feedback/EmptyState';
import { MapView } from '../../../src/components/map/MapView';
import { NavigationLauncher } from '../../../src/components/map/NavigationLauncher';
import { Button } from '../../../src/components/ui';
import { useGoBack } from '../../../src/hooks/useGoBack';
import { useTranslation } from '../../../src/i18n/useTranslation';
import { useTaskStore } from '../../../src/store/useTaskStore';
import type { DeliveryTask } from '../../../src/types/task';

const DEFAULT_COORDINATES = { latitude: -8.5569, longitude: 125.5603 };

const formatFee = (fee: number) => `$${fee.toFixed(2)}`;
const formatDistance = (distanceKm: number) => `${distanceKm.toFixed(1)} KM`;

export default function TaskNavigatePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const goBack = useGoBack('/(main)/tasks');
  const [task, setTask] = useState<DeliveryTask | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void useTaskStore.getState().getById(id).then((next) => {
        if (!active) return;
        if (next && next.status !== 'delivering') {
          router.replace(`/task/${id}`);
          return;
        }
        setTask(next);
      });
      return () => {
        active = false;
      };
    }, [id, router]),
  );

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
                      <Text className="text-xl font-semibold text-[#720003]">{task.estimatedMinutes} Minutes</Text>
                      <Text className="text-sm text-[#59413d]">Delivery route</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="mb-1 text-xs font-bold uppercase tracking-wider text-[#59413d]">{t('flow.totalEarnings')}</Text>
                    <Text className="text-2xl font-bold text-[#720003]">{formatFee(task.fee)}</Text>
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
                  <Text className="font-bold text-[#261816]">Order Summary ({task.items.length} Items)</Text>
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
                <NavigationLauncher destination={task.dropoff.coordinates} label={t('tasks.arrivedDelivery')} />
              )}
            </View>
          </>
        ) : (
          <View className="px-5 pt-8">
            <EmptyState title="Task not found" description="This route is no longer available." />
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-[#fff8f7] p-5 shadow-lg">
        <Button className="bg-[#463200]" onPress={() => router.push(`/task/${id}/sign`)}>
          {t('tasks.arrivedDelivery')}
        </Button>
      </View>
    </View>
  );
}
