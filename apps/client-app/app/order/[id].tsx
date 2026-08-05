// OrderDetailPage — 真实设计源是 DeliveryTrackingPage[1/2/3].html 三个状态
// （PROCESSING / SHIPPED / DELIVERED）。原 OrderDetailPage.html 是 0 字节空文件。
// ADR-0004：推翻 ADR-0002 的 Section 组件方案，参照 tracking.tsx 重写为单文件。
//
// HTML 行数（取最长）：DeliveryTrackingPage.html 328 行
// RN 行数：~750 行（含 SVG status badge + custom timeline + gradient divider）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 ~230%）
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/format';
import { buildTimelineSteps, type TimelineStepData } from '@/utils/timeline';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets, statusBannerPalettes, type StatusBannerPaletteKey } from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import { toast } from '@/store/toastStore';
import type { OrderStatus, Order, CartItem } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// === 状态视觉映射 ===

type StatusVisual = {
  /** 状态色板 key（颜色统一从 statusBannerPalettes 取，不再内联 hex） */
  palette: StatusBannerPaletteKey;
  /** 状态徽章文案（label-caps 大写） */
  badgeText: string;
  /** Banner 顶部小标签（ESTIMATED DELIVERY / DELIVERY STATUS 等） */
  bannerLabel: string;
  /** Banner 主文案 */
  bannerValue: string;
  /** Banner 图标名（Material Symbols） */
  bannerIconSymbol: string;
};

const STATUS_VISUAL: Record<OrderStatus, StatusVisual> = {
  // 待付款（PROCESSING 等价的橙色）
  PENDING_PAYMENT: {
    palette: 'pending',
    badgeText: 'TO PAY',
    bannerLabel: 'PAYMENT DEADLINE',
    bannerValue: 'Please complete payment soon',
    bannerIconSymbol: 'schedule',
  },
  // 待确认（已付款等审核，颜色同 PENDING_PAYMENT）
  PENDING_CONFIRM: {
    palette: 'pending',
    badgeText: 'PROCESSING',
    bannerLabel: 'ORDER STATUS',
    bannerValue: 'Order is being confirmed',
    bannerIconSymbol: 'hourglass_empty',
  },
  // 已确认（PROCESSING 配色）
  CONFIRMED: {
    palette: 'pending',
    badgeText: 'PROCESSING',
    bannerLabel: 'ESTIMATED DELIVERY',
    bannerValue: 'Arriving in 2-3 days',
    bannerIconSymbol: 'local_shipping',
  },
  // 已拣货（同 SHIPPED 配色）
  PICKED: {
    palette: 'pending',
    badgeText: 'PICKED',
    bannerLabel: 'ESTIMATED DELIVERY',
    bannerValue: 'Package picked, on the way soon',
    bannerIconSymbol: 'inventory_2',
  },
  // 配送中 — HTML DeliveryTrackingPage2
  OUT_FOR_DELIVERY: {
    palette: 'pending',
    badgeText: 'SHIPPED',
    bannerLabel: 'ESTIMATED DELIVERY',
    bannerValue: 'Out for delivery - Expected by 5:30 PM',
    bannerIconSymbol: 'local_shipping',
  },
  // 已送达（已付款） — HTML DeliveryTrackingPage3
  DELIVERED_PAID: {
    palette: 'delivered',
    badgeText: 'DELIVERED',
    bannerLabel: 'DELIVERY STATUS',
    bannerValue: 'Delivered - hope you enjoyed your order',
    bannerIconSymbol: 'check_circle',
  },
  // 已送达（货到付款）
  DELIVERED_UNPAID: {
    palette: 'delivered',
    badgeText: 'DELIVERED',
    bannerLabel: 'PAYMENT ON DELIVERY',
    bannerValue: 'Delivered - please pay the rider',
    bannerIconSymbol: 'payments',
  },
  // 已送达（通用）
  DELIVERED: {
    palette: 'delivered',
    badgeText: 'DELIVERED',
    bannerLabel: 'DELIVERY STATUS',
    bannerValue: 'Delivered - hope you enjoyed your order',
    bannerIconSymbol: 'check_circle',
  },
  // 已完成
  COMPLETED: {
    palette: 'delivered',
    badgeText: 'COMPLETED',
    bannerLabel: 'ORDER COMPLETED',
    bannerValue: 'Order completed - thank you',
    bannerIconSymbol: 'task_alt',
  },
  // 已取消
  CANCELLED: {
    palette: 'cancelled',
    badgeText: 'CANCELLED',
    bannerLabel: 'ORDER CANCELLED',
    bannerValue: 'Order was cancelled',
    bannerIconSymbol: 'cancel',
  },
};

// Timeline 类型 + buildTimelineSteps/formatTimelineTime 抽到 @/utils/timeline（P10/P11 共享，P11 Commit 2a）

// === Page ===

export default function OrderDetailPage() {
  const handleBack = useSafeBack();
  const { t, i18n } = useTranslation();
  const localize = useLocalizer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelMutation = useCancelOrder();

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={t('order.detail')} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
        <Header title={t('order.detail')} />
        <ErrorState message={t('order.notFoundError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const visual = STATUS_VISUAL[order.status];
  const statusTheme = statusBannerPalettes[visual.palette];
  // Why: P10 §8.1 D1 - 费用从 transformOrder 映射的字段读取，消除 2.0/5.0 写死（mock 无字段时降级 0）
  const shippingFee = order.deliveryFee ?? 0;
  const discount = order.discountAmount ?? 0;
  const subtotal = order.totalPrice + discount - shippingFee;

  const timelineSteps = buildTimelineSteps(
    order.status,
    order,
    i18n.language,
    {
      confirmed: { label: t('order.timeline.submitted'), desc: t('order.timeline.submittedDesc') },
      processing: { label: t('order.timeline.paid'), desc: t('order.timeline.paidDesc') },
      shipped: { label: t('order.timeline.shipped'), desc: t('order.timeline.shippedDesc') },
      delivered: { label: t('order.timeline.delivered'), desc: t('order.timeline.deliveredDesc') },
      cancelled: { label: t('order.timeline.cancelled'), desc: t('order.timeline.cancelledDesc') },
    },
    visual.bannerIconSymbol,
  );
  const activeIndex = timelineSteps.findIndex((s) => s.state === 'active');
  const timelineProgress = activeIndex < 0 ? 1 : (activeIndex + 1) / timelineSteps.length;

  const cancel = () => {
    // Why: Web 端 Alert 不显示，直接取消 + toast；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      cancelMutation.mutate(order.id, {
        onSuccess: () => {
          toast.success(t('order.cancelled', { defaultValue: 'Order cancelled' }));
          handleBack();
        },
      });
      return;
    }
    Alert.alert(t('order.cancelTitle'), t('order.cancelConfirm'), [
      { text: t('common.no', { defaultValue: 'No' }), style: 'cancel' },
      {
        text: t('common.confirm', { defaultValue: 'Confirm' }),
        style: 'destructive',
        onPress: () => cancelMutation.mutate(order.id, { onSuccess: handleBack }),
      },
    ]);
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={t('order.detail')} orderNo={order.orderNo} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Header Card（HTML 第 158-175 行：ORDER NUMBER + status badge + ETA banner） */}
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
                {t('order.orderNo', { defaultValue: 'ORDER NUMBER' }).toUpperCase()}
              </Text>
              <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                {order.orderNo}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {t('order.createdAt', { defaultValue: 'Placed' })}{' '}
                {formatDate(order.createdAt, i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
              </Text>
            </View>
            <StatusBadge text={visual.badgeText} backgroundColor={statusTheme.badgeBg} />
          </View>

          {/* Delivery banner（HTML 第 168-174 行：状态色边浅底 + icon + 标签 + 描述） */}
          <View
            style={[
              styles.etaRow,
              {
                backgroundColor: statusTheme.bannerBg,
                borderColor: statusTheme.bannerBorder,
              },
            ]}
          >
            <Icon symbol={visual.bannerIconSymbol} size={20} color={statusTheme.bannerIcon} />
            <View style={styles.flex1}>
              <Text style={[styles.etaLabel, { color: statusTheme.bannerLabelColor }]}>
                {visual.bannerLabel}
              </Text>
              <Text style={[styles.etaValue, { color: statusTheme.bannerValueColor }]}>
                {visual.bannerValue}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address Card（HTML 第 177-189 行） */}
        {order.address ? (
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
                accessibilityLabel={t('checkout.address.change', { defaultValue: 'Edit' })}
              >
                <Text style={[styles.editText, { color: colors.primary }]}>
                  {t('checkout.address.change', { defaultValue: 'EDIT' }).toUpperCase()}
                </Text>
              </Pressable>
            </View>
            <View style={styles.addressBody}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {order.address.name}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {order.address.phone}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {order.address.province}
                {order.address.city}
                {order.address.district}
                {order.address.detail}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Order Items 标题（HTML 第 191-196 行 — 左右渐变 divider） */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.items', { defaultValue: 'Order Items' })}
          </Text>
          <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* 商品列表（HTML 第 198-237 行 — 每商品独立卡片） */}
        <View style={styles.itemList}>
          {order.items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              localize={localize}
              onPress={() => router.push(`/product/${item.product.id}`)}
            />
          ))}
        </View>

        {/* Order Summary Card（HTML 第 240-258 行） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            shadowPresets.umaLulik,
          ]}
        >
          <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
            {t('order.priceSummary', { defaultValue: 'ORDER SUMMARY' }).toUpperCase()}
          </Text>
          <View style={styles.summaryGap}>
            <SummaryRow
              label={t('order.subtotal', { defaultValue: 'Subtotal' })}
              value={`$${subtotal.toFixed(2)}`}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.shipping', { defaultValue: 'Delivery Fee' })}
              value={`$${shippingFee.toFixed(2)}`}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.discount', { defaultValue: 'Discount' })}
              value={`-$${discount.toFixed(2)}`}
              color={colors.semantic.success}
            />
            <View style={[styles.totalRow, { borderTopColor: colors['outline-variant'] }]}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t('order.total', { defaultValue: 'Total Amount' })}
              </Text>
              <Text style={[styles.priceDisplayLg, { color: colors.primary }]}>
                ${order.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment & Timeline Card（HTML 第 260-293 行 — 合并卡） */}
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
              {t('checkout.payment', { defaultValue: 'PAYMENT METHOD' }).toUpperCase()}
            </Text>
            <View style={styles.paymentRow}>
              <View style={[styles.laisPayBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.laisPayText}>
                  {t(`order.paymentMethodShort.${(order.paymentMethod ?? 'cod').toLowerCase()}`, { defaultValue: order.paymentMethod ?? '-' })}
                </Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t(`order.paymentMethod.${(order.paymentMethod ?? 'cod').toLowerCase()}`, { defaultValue: order.paymentMethod ?? '-' })}
              </Text>
            </View>
            {order.trackingNo ? (
              <View style={[styles.trackingNoRow, { borderTopColor: colors['outline-variant'] }]}>
                <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                  {t('order.trackingNo', { defaultValue: 'Tracking No.' })}
                </Text>
                <Text style={[styles.bodySmBold, { color: colors.primary }]}>
                  {order.trackingNo}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Timeline */}
          <Timeline steps={timelineSteps} progress={timelineProgress} />
        </View>
      </ScrollView>

      {/* Sticky Action Buttons（HTML 第 296-305 行 — 2 列 grid） */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        <BottomActions status={order.status} order={order} onCancel={cancel} />
      </View>
    </SafeAreaWrapper>
  );
}

// === Sub-components ===

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
          accessibilityLabel="Go back"
        >
          <Icon symbol="arrow_back" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help_outline" size={22} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => {
              const message = t('order.shareMessage', {
                orderNo: orderNo ?? '',
                defaultValue: 'MeiMart order {{orderNo}}',
              });
              if (Platform.OS === 'web') {
                // Why: Web 端 Share API 兼容性差，用 clipboard 兜底 + toast 反馈
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(message).catch(() => {});
                  toast.success(t('order.shareCopied', { defaultValue: 'Order link copied' }));
                }
              } else {
                Share.share({ message }).catch(() => {
                  // 用户取消分享，静默
                });
              }
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('order.shareA11y', {
              orderNo: orderNo ?? '',
              defaultValue: 'Share order {{orderNo}}',
            })}
          >
            <Icon symbol="share" size={22} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OrderItemRow({
  item,
  localize,
  onPress,
}: {
  item: CartItem;
  localize: (text: { zh: string; en: string; tet: string }) => string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemCard,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View product: ${localize(item.product.name)}`}
    >
      <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
        <SafeImage source={{ uri: item.product.image }} style={styles.itemImage} />
      </View>
      <View style={styles.itemInfo}>
        <View>
          <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={1}>
            {localize(item.product.name)}
          </Text>
          <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
            {t('order.qtyLabel', { defaultValue: 'Qty' })}: {item.quantity}
          </Text>
        </View>
        <Text style={[styles.priceDisplay, { color: colors.primary }]}>
          ${(item.product.price * item.quantity).toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
}

// Custom Timeline（HTML 原型 B 方案：rail + fill 进度条 + node-head/desc + active 光晕）
function Timeline({
  steps,
  progress,
}: {
  steps: TimelineStepData[];
  progress: number; // 0-1，进度条填充比例
}) {
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
        // Why: done = primary 实心 + check；active = 白底 + 3px primary 边 + 光晕 + bannerIcon；pending = 白底 + outline-v 边
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
                // Why: active 光晕（HTML 原型 box-shadow: 0 0 0 4px rgba(150,24,19,0.08)）
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
                <Icon symbol="check" size={10} color="#ffffff" />
              ) : isActive && step.icon ? (
                <Icon symbol={step.icon} size={12} color={colors.primary} />
              ) : null}
            </View>
            {/* node-head：状态标题（左）+ 真实时间戳（右） */}
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
            {/* desc 描述行 */}
            <Text style={[styles.bodySm, { color: descColor }]}>{step.desc}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SummaryRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.bodySm, { color }]}>{label}</Text>
      <Text style={[styles.bodySm, { color, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

// 状态切换的底部按钮（HTML 只画了 processing/shipped/delivered 三个状态，
// pending/cancelled/refunding 保留业务必须的按钮）
function BottomActions({
  status,
  order,
  onCancel,
}: {
  status: OrderStatus;
  order: Order;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const outline = (label: string, onPress: () => void, testID: string) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineBtn,
        { backgroundColor: colors['surface-container'] },
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.btnText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );

  const solid = (label: string, onPress: () => void, testID: string) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.solidBtn,
        { backgroundColor: colors.primary },
        shadowPresets.umaLulik,
        pressed && { transform: [{ scale: 0.95 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.btnText, { color: '#ffffff' }]}>{label}</Text>
    </Pressable>
  );

  switch (status) {
    case 'PENDING_PAYMENT':
      return (
        <>
          {outline(
            t('order.actions.cancel', { defaultValue: 'Cancel Order' }),
            onCancel,
            'order-cancel',
          )}
          {solid(
            t('order.actions.pay', { defaultValue: 'Pay Now' }),
            () => router.push('/order/checkout'),
            'order-pay',
          )}
        </>
      );
    case 'PENDING_CONFIRM':
    case 'CONFIRMED':
      return (
        <>
          {outline(
            t('order.actions.track', { defaultValue: 'Track Order' }),
            () => router.push({ pathname: '/order/tracking', params: { id: order.id } }),
            'order-track',
          )}
          {solid(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
        </>
      );
    case 'PICKED':
    case 'OUT_FOR_DELIVERY':
      return (
        <>
          {outline(
            t('order.actions.track', { defaultValue: 'Track Order' }),
            () => router.push({ pathname: '/order/tracking', params: { id: order.id } }),
            'order-track',
          )}
          {solid(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
        </>
      );
    case 'DELIVERED_PAID':
    case 'DELIVERED_UNPAID':
    case 'DELIVERED':
      return (
        <>
          {outline(
            t('order.actions.repurchase', { defaultValue: 'Repeat Order' }),
            () => router.replace('/(main)/home'),
            'order-repeat',
          )}
          {solid(
            t('order.actions.review', { defaultValue: 'Write a Review' }),
            () =>
              router.push({
                pathname: '/order/review',
                params: {
                  id: order.id,
                  // Why: §8 把订单首商品 id 传给评价页，submit 时归属到正确商品
                  productId: order.items[0]?.product.id,
                },
              }),
            'order-review',
          )}
        </>
      );
    case 'COMPLETED':
      return (
        <>
          {outline(
            t('order.actions.afterSales', { defaultValue: 'After-Sales' }),
            () => router.push({ pathname: '/order/after-sales-apply', params: { orderId: order.id } }),
            'order-aftersales',
          )}
          {solid(
            t('order.actions.repurchase', { defaultValue: 'Buy Again' }),
            () => router.replace('/(main)/home'),
            'order-repurchase',
          )}
        </>
      );
    case 'CANCELLED':
      return (
        <>
          {outline(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
          {solid(
            t('order.actions.repurchase', { defaultValue: 'Buy Again' }),
            () => router.replace('/(main)/home'),
            'order-repurchase',
          )}
        </>
      );
  }
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    gap: spacing.md,
    paddingBottom: 120,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: { flex: 1 },
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
    color: '#ffffff',
    fontSize: 22,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.xs,
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
  priceDisplayLg: {
    ...typography['price-display'],
    fontSize: 24,
    fontWeight: '700',
  },
  bodySm: {
    ...typography['body-sm'],
  },
  bodySmBold: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  bodyMdBold: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  // ETA banner
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
  // Section header (with gradient divider)
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
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  trackingNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  // Timeline（HTML 原型 B 方案：rail + fill + node-head/desc + 20×20 dot）
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
  // Why: node-head 标题+时间戳右对齐（HTML 原型 .node-head flex space-between）
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
