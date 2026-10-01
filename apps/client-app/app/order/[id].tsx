// OrderDetailPage — 真实设计源是 DeliveryTrackingPage[1/2/3].html 三个状态
// （PROCESSING / SHIPPED / DELIVERED）。原 OrderDetailPage.html 是 0 字节空文件。
// ADR-0004：推翻 ADR-0002 的 Section 组件方案，参照 tracking.tsx 重写为单文件。
//
// 批5 拆分（C-P3-14）：STATUS_VISUAL/ON_PRIMARY 抽到 order-detail/shared.tsx，
//   Header/Timeline/BottomActions（含 handleRepeatOrder）抽到 order-detail/sections/。
//   主文件保留路由壳 + 数据组装 + OrderItemRow/SummaryRow，行为零变更（纯搬移）。
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import * as expoClipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { formatDate, formatEta, maskPhone, formatPrice } from '@/utils/format';
import { buildTimelineSteps } from '@/utils/timeline';
import { RiderCard, getRiderStatusTag } from '@/components/business/RiderCard';
import {
  useTheme,
  spacing,
  layout,
  typography,
  borderRadius,
  shadowPresets,
  statusBannerPalettes,
} from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import { useOrderEta } from '@/services/queries/useOrderEta';
import { toast } from '@/store/toastStore';
import type { CartItem, LocalizableText } from '@/types';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { STATUS_VISUAL } from './order-detail/shared';
import { Header } from './order-detail/sections/Header';
import { Timeline } from './order-detail/sections/Timeline';
import { BottomActions } from './order-detail/sections/BottomActions';

// === Page ===

export default function OrderDetailPage() {
  const handleBack = useSafeBack();
  const { t, i18n } = useTranslation();
  const localize = useLocalizer();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelMutation = useCancelOrder();
  // P10：轻量 ETA（仅 PICKED/OUT_FOR_DELIVERY 发请求）。hooks 规则 —— 必须在早返回之前无条件调用，
  // status 用 order?.status 兜底（loading 阶段 order 为 undefined）。
  const { data: eta } = useOrderEta(id, order?.status ?? 'PENDING_PAYMENT');

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
  // Why: OUT_FOR_DELIVERY 且拿到真实 ETA（DeliveryTask.estimatedArrival）→ 显示「Arriving <eta>」；
  // 否则 fallback 到 STATUS_VISUAL 配置文案（formatEta locale 映射收口在 format.ts toIntlLocale）
  const bannerValue =
    order.status === 'OUT_FOR_DELIVERY' && eta
      ? t('order.bannerValue.arrivingEta', { eta: formatEta(eta, i18n.language) })
      : t(visual.bannerValueKey);
  // Why: P10 §8.1 D1 - 费用从 transformOrder 映射的字段读取，消除 2.0/5.0 写死（mock 无字段时降级 0）
  // C-P3-3（批4）：Math.max(0, ...) 防负值——异常数据（运费>商品小计）时 subtotal 显示 0 而非负数
  const shippingFee = order.deliveryFee ?? 0;
  const discount = order.discountAmount ?? 0;
  const subtotal = Math.max(0, order.totalPrice + discount - shippingFee);

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
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          <View style={styles.orderHeaderRow}>
            <View style={styles.flex1}>
              <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
                {t('order.orderNo', { defaultValue: 'ORDER NUMBER' }).toUpperCase()}
              </Text>
              <View style={styles.orderNoRow}>
                <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                  {order.orderNo}
                </Text>
                {/* V16：订单号旁复制小按钮（原型 content_copy） */}
                <Pressable
                  onPress={() => {
                    const no = order.orderNo;
                    if (Platform.OS === 'web') {
                      // F7：web 保留 navigator.clipboard（expo-clipboard web 也走它，直连少一层）
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(no).catch(() => {});
                      }
                    } else {
                      // F7：native 迁 expo-clipboard（RN core Clipboard 已废弃，未来版本移除）
                      expoClipboard.setStringAsync(no).catch(() => {});
                    }
                    toast.success(t('order.copied', { defaultValue: 'Copied' }));
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('order.copyOrderNo', { defaultValue: 'Copy order number' })}
                  testID="order-copy-no"
                >
                  <Icon symbol="content_copy" size={14} color={colors['on-surface-variant']} />
                </Pressable>
              </View>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                {t('order.createdAt', { defaultValue: 'Placed' })}{' '}
                {formatDate(order.createdAt, i18n.language)}
              </Text>
            </View>
            <StatusBadge
              text={t(visual.badgeTextKey).toUpperCase()}
              backgroundColor={statusTheme.badgeBg}
            />
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
                {t(visual.bannerLabelKey).toUpperCase()}
              </Text>
              <Text style={[styles.etaValue, { color: statusTheme.bannerValueColor }]}>
                {bannerValue}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Address Card（HTML 第 177-189 行） */}
        {order.address ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
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
                {/* C-P3-6（批4）：收货人手机号脱敏展示（utils/format maskPhone，读屏/截图不泄露全号） */}
                {maskPhone(order.address.phone)}
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

        {/* P10 §3.5 骑手联系卡（rider 字段存在 + 配送中/已完成状态显示，无 rider 字段时隐藏整个模块 - 后端项 1 就绪后透传） */}
        {order.rider && getRiderStatusTag(order.status) ? (
          <RiderCard rider={order.rider} orderStatus={order.status} />
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
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
            {t('order.priceSummary', { defaultValue: 'ORDER SUMMARY' }).toUpperCase()}
          </Text>
          <View style={styles.summaryGap}>
            <SummaryRow
              label={t('order.subtotal', { defaultValue: 'Subtotal' })}
              value={formatPrice(subtotal)}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.shipping', { defaultValue: 'Delivery Fee' })}
              value={formatPrice(shippingFee)}
              color={colors['on-surface']}
            />
            <SummaryRow
              label={t('order.discount', { defaultValue: 'Discount' })}
              value={formatPrice(-discount, 'USD', 2, { sign: true })} // 批2 M3：原 `-${formatPrice(...)}` 前缀手拼收口 sign 档（负值 → `-$x.xx`）
              color={colors.semantic.success}
            />
            <View style={[styles.totalRow, { borderTopColor: colors['outline-variant'] }]}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t('order.total', { defaultValue: 'Total Amount' })}
              </Text>
              <Text style={[styles.priceDisplayLg, { color: colors.primary }]}>
                {formatPrice(order.totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment & Timeline Card（HTML 第 260-293 行 — 合并卡） */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.umaLulik,
          ]}
        >
          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
              {/* Why: checkout.payment 在 locales 里是对象（支付方式 id→文案映射），当字符串用会抛
                  "RETURNED AN OBJECT INSTEAD OF STRING"；改用既有字符串 key order.paymentMethodLabel */}
              {t('order.paymentMethodLabel', { defaultValue: 'PAYMENT METHOD' }).toUpperCase()}
            </Text>
            <View style={styles.paymentRow}>
              <View style={[styles.laisPayBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.laisPayText}>
                  {t(`order.paymentMethodShort.${(order.paymentMethod ?? 'cod').toLowerCase()}`, {
                    defaultValue: order.paymentMethod ?? '-',
                  })}
                </Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                {t(`order.paymentMethod.${(order.paymentMethod ?? 'cod').toLowerCase()}`, {
                  defaultValue: order.paymentMethod ?? '-',
                })}
              </Text>
            </View>
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

function OrderItemRow({
  item,
  localize,
  onPress,
}: {
  item: CartItem;
  localize: (text: LocalizableText) => string;
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
      accessibilityLabel={t('order.viewProductA11y', {
        name: localize(item.product.name),
        defaultValue: 'View product: {{name}}',
      })}
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
          {formatPrice(item.product.price * item.quantity)}
        </Text>
      </View>
    </Pressable>
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
  // Order Header Card
  // V16：订单号 + 复制按钮同行
  orderNoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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
});
