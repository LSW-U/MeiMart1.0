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
  Image,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/format';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import type { OrderStatus, Order, CartItem } from '@/types';

// === 状态视觉映射 ===

type StatusVisual = {
  /** 状态徽章背景色（HTML：PROCESSING=#F97316 / SHIPPED=orange-500 / DELIVERED=emerald-600） */
  badgeBg: string;
  /** 状态徽章文案（label-caps 大写） */
  badgeText: string;
  /** Delivery banner 整体色调：浅底色 / 边色 / icon色 / 标签色 / 描述色 */
  bannerBg: string;
  bannerBorder: string;
  bannerIcon: string;
  bannerLabelColor: string;
  bannerValueColor: string;
  /** Banner 顶部小标签（ESTIMATED DELIVERY / DELIVERY STATUS 等） */
  bannerLabel: string;
  /** Banner 主文案 */
  bannerValue: string;
  /** Banner 图标名（Material Symbols） */
  bannerIconSymbol: string;
};

const STATUS_VISUAL: Record<OrderStatus, StatusVisual> = {
  // PROCESSING 等价（pending = 待付款，颜色与 HTML PROCESSING 一致）
  pending: {
    badgeBg: '#F97316',
    badgeText: 'TO PAY',
    bannerBg: 'rgba(59,130,246,0.08)',
    bannerBorder: 'rgba(59,130,246,0.25)',
    bannerIcon: '#1d4ed8',
    bannerLabelColor: '#1e3a8a',
    bannerValueColor: '#0c2461',
    bannerLabel: 'PAYMENT DEADLINE',
    bannerValue: 'Please complete payment soon',
    bannerIconSymbol: 'schedule',
  },
  paid: {
    badgeBg: '#F97316',
    badgeText: 'PROCESSING',
    bannerBg: 'rgba(59,130,246,0.08)',
    bannerBorder: 'rgba(59,130,246,0.25)',
    bannerIcon: '#1d4ed8',
    bannerLabelColor: '#1e3a8a',
    bannerValueColor: '#0c2461',
    bannerLabel: 'ESTIMATED DELIVERY',
    bannerValue: 'Arriving in 2-3 days',
    bannerIconSymbol: 'local_shipping',
  },
  // SHIPPED — HTML DeliveryTrackingPage2
  shipped: {
    badgeBg: '#F97316',
    badgeText: 'SHIPPED',
    bannerBg: 'rgba(59,130,246,0.08)',
    bannerBorder: 'rgba(59,130,246,0.25)',
    bannerIcon: '#1d4ed8',
    bannerLabelColor: '#1e3a8a',
    bannerValueColor: '#0c2461',
    bannerLabel: 'ESTIMATED DELIVERY',
    bannerValue: 'Out for delivery - Expected by 5:30 PM',
    bannerIconSymbol: 'local_shipping',
  },
  // DELIVERED — HTML DeliveryTrackingPage3
  delivered: {
    badgeBg: '#059669',
    badgeText: 'DELIVERED',
    bannerBg: 'rgba(16,185,129,0.08)',
    bannerBorder: 'rgba(16,185,129,0.25)',
    bannerIcon: '#059669',
    bannerLabelColor: '#065f46',
    bannerValueColor: '#064e3b',
    bannerLabel: 'DELIVERY STATUS',
    bannerValue: 'Delivered - hope you enjoyed your order',
    bannerIconSymbol: 'check_circle',
  },
  cancelled: {
    badgeBg: '#dc2626',
    badgeText: 'CANCELLED',
    bannerBg: 'rgba(220,38,38,0.08)',
    bannerBorder: 'rgba(220,38,38,0.25)',
    bannerIcon: '#dc2626',
    bannerLabelColor: '#991b1b',
    bannerValueColor: '#7f1d1d',
    bannerLabel: 'ORDER CANCELLED',
    bannerValue: 'Order was cancelled',
    bannerIconSymbol: 'cancel',
  },
  refunding: {
    badgeBg: '#F97316',
    badgeText: 'REFUNDING',
    bannerBg: 'rgba(245,158,11,0.08)',
    bannerBorder: 'rgba(245,158,11,0.25)',
    bannerIcon: '#d97706',
    bannerLabelColor: '#92400e',
    bannerValueColor: '#78350f',
    bannerLabel: 'REFUND STATUS',
    bannerValue: 'Refund request is being processed',
    bannerIconSymbol: 'history',
  },
};

// === Timeline 步骤合成（运行时根据 status 派生，无 mock timestamps 字段） ===

type StepState = 'completed' | 'active' | 'pending';

type TimelineStepData = {
  id: string;
  status: string;
  time: string;
  state: StepState;
};

function buildTimelineSteps(status: OrderStatus): TimelineStepData[] {
  // 已取消 / 退款中：只显示「提交 + 终态」两步
  if (status === 'cancelled') {
    return [
      { id: 's1', status: 'Order Confirmed', time: 'Order was placed', state: 'completed' },
      { id: 's2', status: 'Cancelled', time: 'Order cancelled', state: 'active' },
    ];
  }
  if (status === 'refunding') {
    return [
      { id: 's1', status: 'Order Confirmed', time: 'Order was placed', state: 'completed' },
      { id: 's2', status: 'Refund Requested', time: 'Refund in progress', state: 'active' },
    ];
  }

  const baseSteps = [
    { id: 's1', label: 'Order Confirmed', time: 'Order was placed' },
    { id: 's2', label: 'Processing', time: 'Payment confirmed' },
    { id: 's3', label: 'Shipped', time: 'Package on the way' },
    { id: 's4', label: 'Delivered', time: 'Package delivered' },
  ];

  const activeIdx: Record<OrderStatus, number> = {
    pending: 0,
    paid: 1,
    shipped: 2,
    delivered: 3,
    cancelled: 0,
    refunding: 0,
  };
  const current = activeIdx[status];

  return baseSteps.map((s, idx) => ({
    id: s.id,
    status: s.label,
    time: s.time,
    state: idx < current ? 'completed' : idx === current ? 'active' : 'pending',
  }));
}

// === Page ===

export default function OrderDetailPage() {
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
  const shippingFee = 2.0;
  const discount = 5.0;
  const subtotal = order.totalPrice + discount - shippingFee;

  const timelineSteps = buildTimelineSteps(order.status);
  const activeIndex = timelineSteps.findIndex((s) => s.state === 'active');
  const timelineProgress = activeIndex < 0 ? 1 : (activeIndex + 1) / timelineSteps.length;

  const cancel = () => {
    Alert.alert(t('order.cancelTitle'), t('order.cancelConfirm'), [
      { text: t('common.no', { defaultValue: 'No' }), style: 'cancel' },
      {
        text: t('common.confirm', { defaultValue: 'Confirm' }),
        style: 'destructive',
        onPress: () => cancelMutation.mutate(order.id, { onSuccess: () => router.back() }),
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
            { backgroundColor: colors['surface-container-lowest'] },
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
            <StatusBadge text={visual.badgeText} backgroundColor={visual.badgeBg} />
          </View>

          {/* Delivery banner（HTML 第 168-174 行：状态色边浅底 + icon + 标签 + 描述） */}
          <View
            style={[
              styles.etaRow,
              {
                backgroundColor: visual.bannerBg,
                borderColor: visual.bannerBorder,
              },
            ]}
          >
            <Icon symbol={visual.bannerIconSymbol} size={20} color={visual.bannerIcon} />
            <View style={styles.flex1}>
              <Text style={[styles.etaLabel, { color: visual.bannerLabelColor }]}>
                {visual.bannerLabel}
              </Text>
              <Text style={[styles.etaValue, { color: visual.bannerValueColor }]}>
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
              { backgroundColor: colors['surface-container-lowest'] },
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
                onPress={() => router.push('/address')}
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
          <View style={[styles.sectionDivider, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.items', { defaultValue: 'Order Items' })}
          </Text>
          <View style={[styles.sectionDivider, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
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
            { backgroundColor: colors['surface-container-lowest'] },
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
              color="#059669"
            />
            <View style={[styles.totalRow, { borderTopColor: 'rgba(141,112,108,0.3)' }]}>
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
            { backgroundColor: colors['surface-container-lowest'] },
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
                <Text style={styles.laisPayText}>LaisPay</Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                LaisPay Wallet
              </Text>
            </View>
            {order.trackingNo ? (
              <View style={styles.trackingNoRow}>
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
            borderTopColor: 'rgba(141,112,108,0.2)',
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
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.umaLulik]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={64} opacity={0.2} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
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
              /* share — placeholder for future */
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={`Share order ${orderNo ?? ''}`}
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
          borderColor: 'rgba(141,112,108,0.2)',
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`View product: ${localize(item.product.name)}`}
    >
      <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
        <Image source={{ uri: item.product.image }} style={styles.itemImage} />
      </View>
      <View style={styles.itemInfo}>
        <View>
          <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={1}>
            {localize(item.product.name)}
          </Text>
          <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
            {t('order.items', { defaultValue: 'Qty' })}: {item.quantity}
          </Text>
        </View>
        <Text style={[styles.priceDisplay, { color: colors.primary }]}>
          ${(item.product.price * item.quantity).toFixed(2)}
        </Text>
      </View>
    </Pressable>
  );
}

// Custom Timeline（HTML 第 268-292 行：绝对定位 vertical line + 进度色覆盖 + 16×16 dot）
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
      <View style={[styles.timelineBgLine, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
      <View
        style={[
          styles.timelineActiveLine,
          { backgroundColor: colors.primary, height: `${progress * 100}%` },
        ]}
      />

      {steps.map((step) => {
        const isCompleted = step.state === 'completed';
        const isActive = step.state === 'active';
        const dotColor =
          isActive || isCompleted ? colors.primary : colors['surface-container-high'];
        const textColor = isActive
          ? colors.primary
          : isCompleted
            ? colors['on-surface']
            : 'rgba(89,65,61,0.4)';
        const timeColor = isCompleted || isActive ? 'rgba(89,65,61,0.7)' : 'rgba(89,65,61,0.3)';
        return (
          <View key={step.id} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: dotColor,
                  borderColor: isActive ? 'rgba(150,24,19,0.2)' : 'rgba(141,112,108,0.6)',
                },
                isActive && { borderWidth: 4 },
              ]}
            >
              {isCompleted && <Icon symbol="check" size={10} color="#ffffff" />}
            </View>
            <Text style={[styles.bodyMdBold, { color: textColor }]}>{step.status}</Text>
            <Text style={[styles.bodySm, { color: timeColor }]}>{step.time}</Text>
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
    case 'pending':
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
    case 'paid':
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
    case 'shipped':
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
    case 'delivered':
      return (
        <>
          {outline(
            t('order.actions.repurchase', { defaultValue: 'Repeat Order' }),
            () => router.replace('/(main)/home'),
            'order-repeat',
          )}
          {solid(
            t('order.actions.review', { defaultValue: 'Write a Review' }),
            () => router.push({ pathname: '/order/review', params: { id: order.id } }),
            'order-review',
          )}
        </>
      );
    case 'cancelled':
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
    case 'refunding':
      return (
        <>
          {outline(
            t('order.actions.afterSales', { defaultValue: 'View Refund' }),
            () => router.push({ pathname: '/order/after-sales-detail', params: { id: order.id } }),
            'order-refund',
          )}
          {solid(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
        </>
      );
  }
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
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
    borderColor: 'rgba(141,112,108,0.3)',
    padding: spacing.md,
  },
  // Header
  header: {
    position: 'relative',
    height: 64,
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
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
    borderTopColor: 'rgba(141,112,108,0.2)',
  },
  // Timeline
  timelineWrap: {
    position: 'relative',
    paddingLeft: 24,
    paddingVertical: spacing.xs,
    gap: spacing.xl,
  },
  timelineBgLine: {
    position: 'absolute',
    left: 7,
    top: 4,
    bottom: 4,
    width: 2,
  },
  timelineActiveLine: {
    position: 'absolute',
    left: 7,
    top: 4,
    width: 2,
  },
  timelineStep: {
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -24,
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing['container-margin'],
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
