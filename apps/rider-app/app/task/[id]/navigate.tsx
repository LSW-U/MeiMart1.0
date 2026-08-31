import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { DeliveryProgressBar } from '../../../src/components/business/DeliveryProgressBar';
import { StepPageHeader } from '../../../src/components/layout/StepPageHeader';
import { QueryBoundary } from '../../../src/components/feedback/QueryBoundary';
import { showToast } from '../../../src/components/feedback/Toast';
import { MapView } from '../../../src/components/map/MapView';
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
  // T4 §3.1: 三态接入（B3）--loading 骨架 / error 重试 / null 才是任务不存在
  const { data, isLoading, isError, refetch } = useTask(id);
  const task: DeliveryTask | null = data ?? null;
  const startDelivering = useStartDelivering();
  const { isOffline } = useNetwork();

  // P14 ④ B1 + M1: 守卫按 taskType 理清
  // - delivery: 只允许 PICKED_UP（两步跳过 DELIVERING）
  // - return: 允许 PICKED_UP（开始配送前）+ DELIVERING（已开始配送，去签收）
  // Why: navigate 是取货后导航送货；其他状态弹回详情页
  // 基于缓存：守卫读 useTask 缓存（S3），极端竞态下仍可能 409，由提交 toast 兜底（审查 A4）
  // T4 §7.1 拍板 A：守卫读顶层 task（loading 期 data=undefined->null->守卫 return，数据到达 re-run）
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
        const msg =
          e instanceof ApiError ? t('tasks.startDeliveringFailed') : t('common.networkError');
        showToast(msg, 'error');
        return; // 失败不跳 sign，留在 navigate 页
      }
    }
    router.push(`/task/${id}/sign`);
  };

  // T4 §7.9 拍板 A：底栏内联「打开导航」图标按钮（原 ScrollView 内 NavigationLauncher 移除）。
  // 纯 UI 直连 Linking，canOpenURL 检查由 try/catch + webUrl 兜底覆盖（NavigationLauncher 同款逻辑）
  const handleOpenNavigation = async () => {
    if (!task?.dropoff.coordinates) return;
    const { latitude, longitude } = task.dropoff.coordinates;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&dirflg=d`,
      android: `google.navigation:q=${latitude},${longitude}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`,
    });
    try {
      const supported = await Linking.canOpenURL(url!);
      if (supported) {
        await Linking.openURL(url!);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
        await Linking.openURL(webUrl);
      }
    } catch {
      showToast(t('tasks.openNavigationFailed'), 'error');
    }
  };

  // T4 §3.6: dropoff 联系客人（tel: 直拨；聊天无后端 toast 占位）
  const handleCallCustomer = async () => {
    const phone = task?.dropoff.contactPhone;
    if (!phone) return;
    try {
      await Linking.openURL('tel:' + phone);
    } catch {
      showToast(t('common.callFailed'), 'error');
    }
  };

  // return + PICKED_UP: 显示"开始配送"；其他（delivery + PICKED_UP / return + DELIVERING）: 显示"去签收"
  const actionLabel =
    task?.taskType === 'return' && task?.status === 'PICKED_UP'
      ? t('tasks.startDelivery')
      : t('tasks.goSignoff');

  return (
    <View className="flex-1 bg-background">
      {/* B4: 统一页头。真机反馈②：原型 step-title 是「配送导航」非「订单详情」（navigate 页语义） */}
      <StepPageHeader backLabel={t('common.back')} title={t('flow.deliveryNavigation')} />

      <ScrollView className="flex-1" contentContainerClassName="pb-32">
        {/* T4 §3.1: 三态边界（判错 1 修正版：common.loadError.* + taskNotFoundDesc，非
            common.loadFailed/common.routeNotFound--前者不存在，后者是路线失效语义） */}
        {/* 真机反馈：gap 不能放 contentContainer——QueryBoundary 是唯一直接子节点，
            fragment 里的地图/路线卡/订单卡/启动条不吃 gap（上下零间距根因）。
            包一层 gap-3（原型 .content-area gap:12px） */}
        <QueryBoundary<DeliveryTask | null>
          data={data}
          isLoading={isLoading}
          isError={isError}
          isEmpty={(value) => value === null}
          errorTitle={t('common.loadError.title')}
          errorMessage={t('common.loadError.desc')}
          retryLabel={t('common.retry')}
          emptyTitle={t('common.taskNotFound')}
          emptyDescription={t('common.taskNotFoundDesc')}
          skeleton="detail"
          onRetry={() => void refetch()}
        >
          {(taskData) => (
            <View className="gap-3">
              <View className="relative">
                <MapView
                  pickup={
                    taskData.pickup.coordinates
                      ? { ...taskData.pickup.coordinates, title: taskData.pickup.title }
                      : undefined
                  }
                  delivery={
                    taskData.dropoff.coordinates
                      ? { ...taskData.dropoff.coordinates, title: taskData.dropoff.title }
                      : undefined
                  }
                />
                {/* T4 审查修复 P1-1（原型 .map-eta-card）：ETA 浮层卡叠地图底部，「地图即看板」；
                    收入 success 绿（原型 .map-eta-fee），副标题 = 距离 · 配送中 */}
                <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-md">
                  <View className="gap-0.5">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('tasks.etaLabel')}
                    </Text>
                    <Text className="text-[22px] font-extrabold leading-tight text-primary">
                      {t('common.minutes', { minutes: String(taskData.estimatedMinutes) })}
                    </Text>
                    <Text className="text-[11px] text-on-surface-variant">
                      {formatDistance(taskData.distanceKm)} ·{' '}
                      {t('tasks.deliveryProgress.delivering')}
                    </Text>
                  </View>
                  <View className="items-end gap-0.5">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {t('flow.totalEarnings')}
                    </Text>
                    <Text className="text-xl font-extrabold" style={{ color: colors.success }}>
                      {formatCurrency((taskData.fee ?? 0) / 100, t('common.currency'), {
                        decimals: (taskData.fee ?? 0) % 100 === 0 ? 0 : 1,
                      })}
                    </Text>
                    <Text className="text-[10px] text-outline">{taskData.orderId}</Text>
                  </View>
                </View>
              </View>

              {/* T4 审查修复 P1-2（原型 .progress-bar）：三段进度条，消费 deliveryProgress 3 key。
                  T5 审查 P2-1：抽 DeliveryProgressBar 共享组件（与 sign 收口，业务 step 语义在调用方推导）。
                  真机反馈①：进 navigate 页即处于「配送中」段（原型 271-289：step1 done 绿✓ + step2 active 红），
                  原 step=1 把「已取货」当当前步语义错——PICKED_UP/DELIVERING 都是 step2 active */}
              <View className="px-3 pb-2 pt-3">
                <DeliveryProgressBar
                  labels={[
                    t('tasks.deliveryProgress.pickedUp'),
                    t('tasks.deliveryProgress.delivering'),
                    t('tasks.deliveryProgress.pending'),
                  ]}
                  step={2}
                />
              </View>

              <View className="gap-4 px-5">
                <View className="rounded-xl border border-outline/10 bg-surface p-4 shadow-md">
                  {/* P1-1 后 ETA 区已移地图浮层；此卡承载路线 + 订单摘要 */}

                  <View className="relative gap-6">
                    <View className="absolute bottom-8 left-[15px] top-8 w-0.5 border-l border-dotted border-outline bg-outline-variant" />
                    <View className="z-10 flex-row gap-4">
                      {/* T4 审查修复 P2-1（原型 .route-marker）：序号化 ①②，pickup 红底/dropoff 棕底白字 */}
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Text className="text-[13px] font-extrabold text-white">1</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold leading-tight text-on-surface">
                          {taskData.pickup.title}
                        </Text>
                        <Text className="mt-1 text-sm text-on-surface-variant">
                          {taskData.pickup.address}
                        </Text>
                        <Text className="mt-2 self-start rounded-lg bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {t('flow.storePickup')}
                        </Text>
                      </View>
                      <Text className="text-xs font-bold uppercase tracking-wider text-outline">
                        {formatDistance(pickupDistance(taskData.distanceKm))}
                      </Text>
                    </View>
                    <View className="z-10 flex-row gap-4">
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.tertiary }}
                      >
                        <Text className="text-[13px] font-extrabold text-white">2</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold leading-tight text-on-surface">
                          {taskData.dropoff.title}
                        </Text>
                        <Text className="mt-1 text-sm text-on-surface-variant">
                          {taskData.dropoff.address}
                        </Text>
                        {/* T4 审查修复 P3-1（原型 .route-tag.dropoff）：送货上门 tag（对称 pickup 到店取货）。
                            原型 bg tertiary-soft 是幽灵 token，用 bg-surface-container + tertiary 文字色 */}
                        <Text
                          className="mt-2 self-start rounded-lg bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: colors.tertiary }}
                        >
                          {t('tasks.doorDelivery')}
                        </Text>
                        {/* T4 §3.2: 假 chips（verifiedReceiver/leaveAtDoor 无字段支撑）已删；
                            §3.6 新增 dropoff 联系客人入口 */}
                        {/* B1 裁决 B（原型 .contact-block）：分隔线上边框 + 姓名一行(人形图标)/电话一行
                            + 右侧两个 40×40 图标钮（call 绿 success / chat 蓝 info），禁用态灰底。
                            真机反馈③：原型此区常驻——无条件渲染，无姓名/电话时占位文案（不再整块消失） */}
                        <View className="mt-3 flex-row items-center gap-2.5 border-t border-surface-variant pt-2.5">
                          <View className="min-w-0 flex-1">
                            <View className="flex-row items-center gap-1">
                              <AppIcon className="text-on-surface" name="account" size={13} />
                              <Text className="text-xs font-semibold text-on-surface">
                                {taskData.dropoff.contactName || t('tasks.recipient')}
                              </Text>
                            </View>
                            <Text className="mt-0.5 text-[11px] text-on-surface-variant">
                              {taskData.dropoff.contactPhone || t('tasks.noPhone')}
                            </Text>
                          </View>
                          {/* B1 裁决 B（原型 .contact-btns）：call/chat 两按钮包一组，组内 gap:8px
                              （原型 :130），与 contact-info 之间走外层 gap:10px——避免三节点平摊
                              把按钮间距撑成 10px（原型按钮间是 8px） */}
                          <View className="flex-row gap-2">
                            <Pressable
                              accessibilityLabel={
                                taskData.dropoff.contactPhone
                                  ? t('tasks.callCustomer')
                                  : t('tasks.noPhone')
                              }
                              accessibilityRole="button"
                              accessibilityState={{ disabled: !taskData.dropoff.contactPhone }}
                              className={
                                'h-10 w-10 items-center justify-center rounded-[10px]' +
                                (taskData.dropoff.contactPhone ? '' : ' bg-neutral-bg')
                              }
                              style={
                                taskData.dropoff.contactPhone
                                  ? { backgroundColor: colors.success }
                                  : undefined
                              }
                              disabled={!taskData.dropoff.contactPhone}
                              onPress={() => void handleCallCustomer()}
                            >
                              {/* 禁用态（原型 .contact-btn.disabled）：neutral-bg 浅底 + outline 图标 */}
                              <AppIcon
                                color={
                                  taskData.dropoff.contactPhone ? colors.surface : colors.outline
                                }
                                name="phone"
                                size={18}
                              />
                            </Pressable>
                            <Pressable
                              accessibilityHint={t('tasks.chatComingSoon')}
                              accessibilityLabel={t('tasks.chat')}
                              accessibilityRole="button"
                              className="h-10 w-10 items-center justify-center rounded-[10px]"
                              style={{ backgroundColor: colors.info }}
                              onPress={() => showToast(t('tasks.chatComingSoon'), 'info')}
                            >
                              <AppIcon color={colors.surface} name="chat" size={18} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                      <Text className="text-xs font-bold uppercase tracking-wider text-outline">
                        {formatDistance(taskData.distanceKm)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 真机反馈④（原型 :333 .order-card）：订单摘要是独立卡（与 route-card 平级），
                  原实现混在路线卡内（视觉上无卡边界）。标题行 = 订单摘要 + N 件（.order-head） */}
              <View className="px-5">
                <View className="rounded-xl border border-outline/10 bg-surface p-4 shadow-md">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-on-surface">
                      {t('common.orderSummaryTitle')}
                    </Text>
                    <Text className="text-xs font-bold text-on-surface-variant">
                      {t('common.itemsCount', { count: String(taskData.items.length) })}
                    </Text>
                  </View>
                  <View className="mt-4 gap-3">
                    {/* T4 §3.3: qty1「数量：1」假数据已删（items 元素本身含数量描述，
                        再贴恒 1 与「2 units」自相矛盾）；审查修复 P2-2（原型 .order-item-dot）补 6px 圆点 */}
                    {taskData.items.map((item) => (
                      <View className="flex-row items-center gap-2.5" key={item}>
                        <View className="h-1.5 w-1.5 rounded-full bg-outline-variant" />
                        <Text className="flex-1 text-[13px] text-on-surface">{item}</Text>
                      </View>
                    ))}
                    {taskData.note ? (
                      <View className="mt-2 rounded-lg border-l-4 border-primary bg-surface p-3">
                        {/* 审查修复 P3-2（原型 .note-label）：label 补 info 图标 */}
                        <View className="mb-1 flex-row items-center gap-1">
                          <AppIcon className="text-primary" name="info" size={10} />
                          <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            {t('flow.customerNote')}
                          </Text>
                        </View>
                        <Text className="text-sm italic text-on-surface">{taskData.note}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* 真机反馈②（原型 :355 .nav-launch-row）：订单摘要下的「打开系统导航」启动条
                  （白底描边卡 + pin 图标 + primary 文字，整条可点）。
                  真机反馈三轮：pin 装进 28px primary 圆底（用户裁定，同进度条 step-dot 形态）白图标 */}
              <Pressable
                accessibilityLabel={t('tasks.openNavigation')}
                accessibilityRole="button"
                className="mx-5 flex-row items-center justify-center gap-2 rounded-xl border border-surface-variant bg-surface p-3 shadow-sm"
                disabled={!taskData.dropoff.coordinates}
                onPress={() => void handleOpenNavigation()}
              >
                <View
                  className="h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primary }}
                >
                  <AppIcon color={colors.surface} name="pin" size={16} />
                </View>
                <Text className="text-[13px] font-semibold text-primary">
                  {t('tasks.openNavigation')}
                </Text>
              </Pressable>
            </View>
          )}
        </QueryBoundary>
      </ScrollView>

      {/* T4 §7.9 拍板 A + §3.5: 底栏双 CTA--左「打开导航」52px 图标按钮（内联 Linking，
          onError 接 toast，原 ScrollView 内 NavigationLauncher 移除）+ 右主按钮 flex-1。
          审查修复 P2-4/Q-1/Q-2：主按钮 bg-tertiary → bg-primary（主 CTA 对齐原型与兄弟页）、
          左按钮图标 pickup → navigation（语义修正）、补 border-top（原型 .bottom-bar） */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center gap-3 border-t border-surface-variant bg-surface p-5 shadow-lg">
        <Pressable
          accessibilityLabel={t('tasks.openNavigation')}
          accessibilityRole="button"
          className="h-[52px] w-[52px] items-center justify-center rounded-xl bg-surface-container"
          disabled={!task?.dropoff.coordinates}
          onPress={() => void handleOpenNavigation()}
        >
          {/* 真机反馈③：原型 .btn-secondary 是地图 pin（水滴+圆心）非箭头，对齐 nav-launch 同形 */}
          <AppIcon className="text-primary" name="pin" size={22} />
        </Pressable>
        <View className="flex-1">
          <Button
            className="bg-primary"
            disabled={!task || startDelivering.isPending}
            loading={startDelivering.isPending}
            onPress={() => void handleNavigateAction()}
          >
            {startDelivering.isPending ? t('flow.processing') : actionLabel}
          </Button>
        </View>
      </View>
    </View>
  );
}
