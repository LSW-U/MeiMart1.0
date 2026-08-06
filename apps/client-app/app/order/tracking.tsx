// DeliveryTrackingPage — 还原自 DeliveryTrackingPage.html（328 行）
// HTML 行数 328 → RN ~430（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-21: PrimaryHeader + tais-pattern + 地图占位 + 骑手卡 + 渐变进度条 + uma-lulik-shadow + 费用明细
import { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { formatDate } from '@/utils/format';
import { useTranslation } from 'react-i18next';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets, getStatusBannerTheme } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PriceText } from '@/components/ui/PriceText';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useOrderTracking } from '@/services/queries/useTracking';
import { toast } from '@/store/toastStore';
import type { RiderLocation } from '@/services/tracking';
import { buildTimelineSteps, type TimelineStepData } from '@/utils/timeline';
import { RiderCard, getRiderStatusTag } from '@/components/business/RiderCard';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import { useLocalizer } from '@/i18n';
import type { OrderStatus } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// 原因：红底白字 dark 不变（Header 3 icon/done dot/Contact Seller btn 都是 colors.primary 红底白字，与 P10 ON_PRIMARY const 模式一致）
// 豁免：mapPinFrom/riderDot/mapLabel 白底（叠地图保可见性，与 mapLabel rgba(255,255,255,0.9) 同性质，不走 ON_PRIMARY）
const ON_PRIMARY = '#ffffff';

// P11 Commit 2b: COURIER mock 删除，骑手数据走 RiderCard 的 props（后端 rider 字段就绪后由 transformOrder 透传）

// P11 Commit 2a: TIMELINE mock 删除，走 buildTimelineSteps（@/utils/timeline）消费 order 时间戳

// STAR_COLOR 移到 RiderCard 内部（P11 Commit 2b，骑手卡共享件）

// Why: P11 Commit 3 D4 - StatusBadge 文案按 status 动态（复用 order.status.* 既有 i18n，新 10 枚举映射到旧 key）
function getStatusBadgeKey(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    PENDING_PAYMENT: 'order.status.pending',
    PENDING_CONFIRM: 'order.status.paid',
    CONFIRMED: 'order.status.paid',
    PICKED: 'order.status.shipped',
    OUT_FOR_DELIVERY: 'order.status.shipped',
    DELIVERED_PAID: 'order.status.delivered',
    DELIVERED_UNPAID: 'order.status.delivered',
    DELIVERED: 'order.status.delivered',
    COMPLETED: 'order.status.delivered',
    CANCELLED: 'order.status.cancelled',
  };
  return map[status];
}

export default function DeliveryTrackingPage() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const localize = useLocalizer();
  const params = useLocalSearchParams<{ id?: string }>();
  // Why: 接真实订单数据，OrderItems + 地址 + trackingNo 都从 order 拿
  const { data: order, isLoading, isError, refetch } = useOrder(params.id);
  // Why: Phase 6 启动 WS 配送追踪（join:order + 监听 order:location/order:status-changed + 5s 无消息降级 HTTP 轮询）。
  // Why: D5 接线 - riderLocation 地图骑手定位；lastOrderStatus 用于 Commit 3 流程收口（完成态判断）。
  const { riderLocation, lastOrderStatus } = useOrderTracking(params.id);
  // Why: 取消订单 mutation（hooks 顶层，与 useOrder 同级；CONFIRMED 待发货状态用）
  const cancelMutation = useCancelOrder();
  // Why: F1 Track Order 滚动到顶部地图
  const scrollViewRef = useRef<ScrollView>(null);

  // Why: P11 Commit 3 决策 3 - 配送结束（DELIVERED*/COMPLETED）延迟 1.5s 自动跳回 P10 订单详情（hooks 顶层，loading 态前；P10 显示完成态 + 骑手卡 + 售后入口）
  useEffect(() => {
    if (!order) return;
    const s = lastOrderStatus ?? order.status;
    const isCompleted =
      s === 'DELIVERED_PAID' || s === 'DELIVERED_UNPAID' || s === 'DELIVERED' || s === 'COMPLETED';
    if (isCompleted && params.id) {
      const timer = setTimeout(() => {
        router.replace(`/order/${params.id}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [order, lastOrderStatus, params.id]);

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={t('tracking.title', { defaultValue: 'Order Tracking' })} />
        <LoadingOverlay visible />
      </SafeAreaWrapper>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={t('tracking.title', { defaultValue: 'Order Tracking' })} />
        <ErrorState
          message={t('errors.orderNotFound', { defaultValue: 'Order not found' })}
          onRetry={() => refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  const trackingNo = order.trackingNo ?? order.orderNo;
  // Why: P11 Commit 3 - lastOrderStatus（WS 实时）优先于 order.status（初始查询），保证状态最新
  const currentStatus = lastOrderStatus ?? order.status;
  // Why: P11 取消订单（CONFIRMED 待发货可取消，与 P10 BottomActions 一致；cancel 后跳回 P10 订单详情）
  const handleCancel = () => {
    const onCancelSuccess = () => {
      toast.success(t('order.cancelled', { defaultValue: 'Order cancelled' }));
      router.replace(`/order/${params.id}`);
    };
    if (Platform.OS === 'web') {
      cancelMutation.mutate(order.id, { onSuccess: onCancelSuccess });
    } else {
      Alert.alert(
        t('order.cancelTitle', { defaultValue: 'Confirm cancel' }),
        t('order.cancelConfirm', { defaultValue: 'Cancel this order?' }),
        [
          { text: t('common.no', { defaultValue: 'No' }), style: 'cancel' },
          { text: t('common.yes', { defaultValue: 'Yes' }), style: 'destructive', onPress: () => cancelMutation.mutate(order.id, { onSuccess: onCancelSuccess }) },
        ],
      );
    }
  };
  // Why: 按订单状态动态取 banner 配色（与 [id].tsx 一致，不再写死 pending）
  const statusTheme = getStatusBannerTheme(currentStatus);
  const address = order.address;
  // Why: P11 Commit 2a - Timeline 走共享 buildTimelineSteps，消费 order 真实时间戳 + t() labels（与 P10 同源）
  const timelineSteps = buildTimelineSteps(
    currentStatus,
    order,
    i18n.language,
    {
      confirmed: { label: t('order.timeline.submitted'), desc: t('order.timeline.submittedDesc') },
      processing: { label: t('order.timeline.paid'), desc: t('order.timeline.paidDesc') },
      shipped: { label: t('order.timeline.shipped'), desc: t('order.timeline.shippedDesc') },
      delivered: { label: t('order.timeline.delivered'), desc: t('order.timeline.deliveredDesc') },
      cancelled: { label: t('order.timeline.cancelled'), desc: t('order.timeline.cancelledDesc') },
    },
    'local_shipping',
  );
  const timelineActiveIndex = timelineSteps.findIndex((s) => s.state === 'active');
  const timelineProgress = timelineActiveIndex < 0 ? 1 : (timelineActiveIndex + 1) / timelineSteps.length;

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={t('tracking.title', { defaultValue: 'Order Tracking' })} orderNo={order.orderNo} />

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header Card（HTML 第 158-175 行 — ORDER NUMBER + PROCESSING badge + ETA） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.umaLulik,
          ]}
        >
          <View style={styles.orderHeaderRow}>
            <View style={styles.flex1}>
              <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
                {t('order.orderNo', { defaultValue: 'Order number' }).toUpperCase()}
              </Text>
              <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                {trackingNo}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {formatDate(order.createdAt, i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
              </Text>
            </View>
            <StatusBadge text={t(getStatusBadgeKey(currentStatus), { defaultValue: currentStatus })} backgroundColor={statusTheme.badgeBg} />
          </View>

          {/* ESTIMATED DELIVERY（HTML 第 168-174 行 — blue-50/50 bg；复用 pending 色板）*/}
          <View
            style={[
              styles.etaRow,
              {
                backgroundColor: statusTheme.bannerBg,
                borderColor: statusTheme.bannerBorder,
              },
            ]}
          >
            <Icon symbol="local_shipping" size={20} color={statusTheme.bannerIcon} />
            <View style={styles.flex1}>
              <Text style={[styles.etaLabel, { color: statusTheme.bannerLabelColor }]}>{t('tracking.estimatedDelivery', { defaultValue: 'Estimated delivery' }).toUpperCase()}</Text>
              <Text style={[styles.etaValue, { color: statusTheme.bannerValueColor }]}>
                {t('tracking.etaPlaceholder', { defaultValue: 'Arriving Today' })} 4:00 PM - 6:00 PM
              </Text>
            </View>
          </View>
        </View>

        {/* Map 占位区（Fix-21 #2 — react-native-maps 未装时用图占位） */}
        <MapPlaceholder riderLocation={riderLocation} />

        {/* 配送员信息卡片（Fix-21 #3 — 头像+名字+电话按钮） */}
        {/* B1 修复：接 order.rider（与 P10 一致），real 模式字段缺失时隐藏（降级正确，避免假骑手误导） */}
        {order.rider && getRiderStatusTag(order.status) ? (
          <RiderCard rider={order.rider} orderStatus={order.status} />
        ) : null}

        {/* Delivery Address Card（HTML 第 177-189 行） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.umaLulik,
          ]}
        >
          <View style={styles.addressHeaderRow}>
            <View style={styles.addressTitleRow}>
              <Icon symbol="location_on" size={20} color={colors.primary} />
              <Text style={[styles.addressTitle, { color: colors['on-surface'] }]}>
                {t('order.shippingInfo', { defaultValue: 'Delivery Address' })}
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/address/list')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('checkout.address.change', { defaultValue: 'Change' })}
            >
              <Text style={[styles.editText, { color: colors.primary }]}>{t('checkout.address.change', { defaultValue: 'Change' }).toUpperCase()}</Text>
            </Pressable>
          </View>
          <View style={styles.addressBody}>
            <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
              {address?.name ?? t('tracking.unknownRecipient', { defaultValue: 'Recipient' })}
            </Text>
            <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
              {address
                ? `${address.detail}, ${address.district}, ${address.city}, ${address.province}`
                : t('tracking.unknownAddress', { defaultValue: 'Address not available' })}
            </Text>
            {address?.phone ? (
              <Text style={[styles.bodySm, { color: colors['on-surface-variant' ]}]}>
                {address.phone}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Order Items 标题（HTML 第 191-196 行 — 渐变 divider） */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>{t('order.items', { defaultValue: 'Items' })}</Text>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* 商品列表（HTML 第 198-237 行 — 3 items） */}
        <View style={styles.itemList}>
          {order.items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
                <SafeImage source={{ uri: item.product.image }} style={styles.itemImage} />
              </View>
              <View style={styles.itemInfo}>
                <View>
                  <Text
                    style={[styles.itemName, { color: colors['on-surface'] }]}
                    numberOfLines={1}
                  >
                    {localize(item.product.name)}
                  </Text>
                  <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                    {t('cart.quantity', { defaultValue: 'Qty' })}: {item.quantity}
                  </Text>
                </View>
                <PriceText value={item.product.price * item.quantity} size="lg" />
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary（HTML 第 240-258 行） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.umaLulik,
          ]}
        >
          <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
            ORDER SUMMARY
          </Text>
          <View style={styles.summaryGap}>
            {/* TODO(长期): 后端订单返回 subtotal/deliveryFee/discount 字段后恢复分项显示 */}
            <View style={[styles.totalRow, { borderTopColor: colors['outline-variant'] }]}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>{t('order.total', { defaultValue: 'Total' })}</Text>
              <PriceText value={order.totalPrice} size="lg" />
            </View>
          </View>
        </View>

        {/* Payment & Timeline Card（HTML 第 260-293 行） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.umaLulik,
          ]}
        >
          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
              {t('order.paymentMethodLabel', { defaultValue: 'Payment Method' }).toUpperCase()}
            </Text>
            <View style={styles.paymentRow}>
              <View style={[styles.laisPayBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.laisPayText}>{t(`order.paymentMethodShort.${(order.paymentMethod ?? 'cod').toLowerCase()}`, { defaultValue: order.paymentMethod ?? '-' })}</Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t(`order.paymentMethod.${(order.paymentMethod ?? 'cod').toLowerCase()}`, { defaultValue: order.paymentMethod ?? '-' })}
              </Text>
            </View>
          </View>

          {/* Timeline */}
          <Timeline steps={timelineSteps} progress={timelineProgress} />
        </View>
      </ScrollView>

      {/* Sticky Action Buttons（HTML 第 296-305 行 — Track Order + Contact Seller） */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        {currentStatus === 'PENDING_CONFIRM' || currentStatus === 'CONFIRMED' ? (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.outlineBtn,
              { backgroundColor: colors['surface-container'] },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('order.actions.cancel', { defaultValue: 'Cancel Order' })}
          >
            <Text style={[styles.btnText, { color: colors.primary }]}>{t('order.actions.cancel', { defaultValue: 'Cancel Order' })}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }}
            style={({ pressed }) => [
              styles.outlineBtn,
              { backgroundColor: colors['surface-container'] },
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('order.actions.track', { defaultValue: 'Track shipment' })}
          >
            <Text style={[styles.btnText, { color: colors.primary }]}>{t('order.actions.track', { defaultValue: 'Track shipment' })}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/service')}
          style={({ pressed }) => [
            styles.solidBtn,
            { backgroundColor: colors.primary },
            shadowPresets.umaLulik,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('order.actions.contactSeller', { defaultValue: 'Contact seller' })}
        >
          <Text style={[styles.btnText, { color: ON_PRIMARY }]}>{t('order.actions.contactSeller', { defaultValue: 'Contact seller' })}</Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

// PrimaryHeader（HTML 第 138-155 行 — primary + tais-pattern + arrow_back + help + share）
function Header({ title, orderNo }: { title: string; orderNo?: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.umaLulik]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={64} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.help', { defaultValue: 'Help' })}
          >
            <Icon symbol="help_outline" size={24} color={ON_PRIMARY} />
          </Pressable>
          <Pressable
            onPress={() => {
              const message = t('order.shareMessage', { orderNo: orderNo ?? '', defaultValue: 'MeiMart order {{orderNo}}' });
              if (Platform.OS === 'web') {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(message).catch(() => {});
                }
              } else {
                Share.share({ message }).catch(() => {});
              }
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('order.shareA11y', { orderNo: orderNo ?? '', defaultValue: 'Share order {{orderNo}}' })}
          >
            <Icon symbol="share" size={24} color={ON_PRIMARY} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 地图占位（Fix-21 #2 — react-native-maps 未装时用样式占位）
function MapPlaceholder({ riderLocation }: { riderLocation: RiderLocation | null }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      style={[
        styles.mapWrap,
        {
          backgroundColor: colors['surface-container'],
          borderColor: colors['outline-variant'],
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={t('tracking.mapA11y', { defaultValue: 'Map showing delivery route' })}
    >
      {/* 模拟地图街道网 */}
      <View style={styles.mapGrid} pointerEvents="none">
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} style={styles.mapGridRow}>
            {[0, 1, 2, 3, 4].map((col) => (
              <View
                key={col}
                style={[
                  styles.mapGridCell,
                  {
                    backgroundColor:
                      (row + col) % 2 === 0 ? 'rgba(141,112,108,0.08)' : 'transparent',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 中心路线 + pin */}
      <View style={styles.mapCenter} pointerEvents="none">
        <View style={[styles.mapRoute, { backgroundColor: colors.primary }]} />
        <View style={[styles.mapPinFrom, { borderColor: colors.primary }]}>
          <Icon symbol="location_on" size={16} color={colors.primary} />
        </View>
        <View style={[styles.mapPinTo, { backgroundColor: colors.primary }]} />
        {/* Why: D5 接线 - 有骑手位置时显示骑手定位 dot + 脉冲光晕（two_wheeler，占位地图装饰性定位） */}
        {riderLocation ? (
          <View style={styles.riderDot} pointerEvents="none">
            <View style={[styles.riderDotPulse, { shadowColor: colors.primary }]} />
            <Icon symbol="two_wheeler" size={20} color={colors.primary} />
          </View>
        ) : null}
      </View>

      <View style={styles.mapLabel}>
        <Icon symbol="location_on" size={12} color={colors.primary} />
        <Text style={[styles.mapLabelText, { color: colors['on-surface-variant'] }]}>
          {t('tracking.liveTracking', { defaultValue: 'Live tracking' })} • Dili
        </Text>
      </View>
    </View>
  );
}

// 配送员卡片（Fix-21 #3）
// CourierCard 移到 @/components/business/RiderCard（P11 Commit 2b，P10/P11 共享）

// Timeline（HTML 原型 B 方案：rail + fill + node-head/desc + active 光晕，与 P10 同源）
function Timeline({ steps, progress }: { steps: TimelineStepData[]; progress: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.timelineWrap}>
      <View style={[styles.timelineBgLine, { backgroundColor: colors['outline-variant'] }]} />
      <View
        style={[
          styles.timelineActiveLine,
          { backgroundColor: colors.primary, height: `${progress * 100}%` },
        ]}
      />

      {steps.map((step) => {
        const isCompleted = step.state === 'completed';
        const isActive = step.state === 'active';
        const dotBg = isCompleted ? colors.primary : colors['surface-container-lowest'];
        const dotBorder = isActive ? colors.primary : colors['outline-variant'];
        const labelColor = isActive
          ? colors.primary
          : isCompleted
            ? colors['on-surface']
            : colors['on-surface-variant'];
        const descColor = isActive ? colors['on-surface'] : colors['on-surface-variant'];
        return (
          <View key={step.id} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: dotBg,
                  borderColor: dotBorder,
                  borderWidth: isActive ? 3 : 2,
                },
                isActive && {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 4,
                  shadowOpacity: 0.08,
                  elevation: 2,
                },
              ]}
            >
              {isCompleted ? (
                <Icon symbol="check" size={10} color={ON_PRIMARY} />
              ) : isActive && step.icon ? (
                <Icon symbol={step.icon} size={12} color={colors.primary} />
              ) : null}
            </View>
            <View style={styles.timelineHead}>
              <Text style={[styles.bodyMdBold, { color: labelColor, flex: 1 }]} numberOfLines={1}>
                {step.label}
              </Text>
              {step.time ? (
                <Text
                  style={[styles.timelineTime, { color: colors['on-surface-variant'] }]}
                  numberOfLines={1}
                >
                  {step.time}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.bodySm, { color: descColor }]}>{step.desc}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    gap: spacing.md,
    paddingBottom: 120,
  },
  flex1: {
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  // Header
  header: {
    position: 'relative',
    height: 64,
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: ON_PRIMARY,
    fontSize: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  // Order Header Card
  orderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  labelCaps: {
    ...typography['label-caps'],
    marginBottom: spacing.xs,
  },
  priceDisplay: {
    ...typography['price-display'],
    fontWeight: '700',
    marginBottom: 2,
  },
  bodySm: {
    ...typography['body-sm'],
  },
  bodyMdBold: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  etaLabel: {
    ...typography['label-caps'],
    fontSize: 10,
    marginBottom: 2,
  },
  etaValue: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  // Map
  mapWrap: {
    position: 'relative',
    height: 140,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapGridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mapGridCell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(141,112,108,0.1)',
  },
  mapCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapRoute: {
    position: 'absolute',
    width: 100,
    height: 3,
    opacity: 0.7,
    transform: [{ rotate: '-12deg' }],
  },
  mapPinFrom: {
    position: 'absolute',
    left: -50,
    backgroundColor: '#ffffff',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinTo: {
    position: 'absolute',
    right: -50,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  // Why: 骑手定位 dot（D5 接线，占位地图装饰性，固定在路线中部）
  riderDot: {
    position: "absolute",
    left: "45%",
    top: "50%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  riderDotPulse: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
    elevation: 3,
  },
  mapLabel: {
    position: 'absolute',
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  mapLabelText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  // Courier

  // Address
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addressTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  editText: {
    ...typography['label-caps'],
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  addressBody: {
    paddingLeft: 28,
    gap: 2,
  },
  // Section header（with gradient divider）
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionDivider: {
    height: 2,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  // Items
  itemList: {
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.sm,
  },
  itemImageWrap: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemInfo: {
    flex: 1,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  itemName: {
    ...typography['body-md'],
    fontWeight: '700',
    marginBottom: 2,
  },
  // Summary
  summaryGap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  // Payment & Timeline
  paymentSection: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  laisPayBadge: {
    width: 40,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laisPayText: {
    color: ON_PRIMARY,
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  // Timeline（HTML 原型 B 方案：rail + fill + node-head/desc + 20×20 dot，与 P10 同源）
  timelineWrap: {
    position: 'relative',
    paddingLeft: 28,
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  timelineBgLine: {
    position: 'absolute',
    left: 9,
    top: 14,
    bottom: 14,
    width: 2,
  },
  timelineActiveLine: {
    position: 'absolute',
    left: 9,
    top: 14,
    width: 2,
  },
  timelineStep: {
    position: 'relative',
    minHeight: 28,
  },
  timelineDot: {
    position: 'absolute',
    left: -28,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  outlineBtn: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtn: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
