// DeliveryTrackingPage — 还原自 DeliveryTrackingPage.html（328 行）
// HTML 行数 328 → RN ~430（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-21: PrimaryHeader + tais-pattern + 地图占位 + 骑手卡 + 渐变进度条 + uma-lulik-shadow + 费用明细
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { buildTimelineSteps, type TimelineStepData } from '@/utils/timeline';
import { useOrder } from '@/services/queries/useOrders';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';

// 配送员 mock（HTML 同款）
const COURIER = {
  name: 'João Pereira',
  vehicle: 'Scooter • TL-2024-DL',
  phone: '+670 7712 3456',
  rating: 4.9,
};

// P11 Commit 2a: TIMELINE mock 删除，走 buildTimelineSteps（@/utils/timeline）消费 order 时间戳

const STAR_COLOR = '#f59e0b'; // 原因：骑手评分星标金色（HTML star gold amber-500），semantic 无对应角色

export default function DeliveryTrackingPage() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const localize = useLocalizer();
  const params = useLocalSearchParams<{ id?: string }>();
  // Why: 接真实订单数据，OrderItems + 地址 + trackingNo 都从 order 拿
  const { data: order, isLoading, isError, refetch } = useOrder(params.id);
  // Why: Phase 6 启动 WS 配送追踪（join:order + 监听 order:location/order:status-changed + 5s 无消息降级 HTTP 轮询）。
  // Why: 物流时间线已接真实时间戳（Commit 2a buildTimelineSteps），配送员 + riderLocation 待 Commit 2b/2c 接入。
  useOrderTracking(params.id);

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
  // Why: 按订单状态动态取 banner 配色（与 [id].tsx 一致，不再写死 pending）
  const statusTheme = getStatusBannerTheme(order.status);
  const address = order.address;
  // Why: P11 Commit 2a - Timeline 走共享 buildTimelineSteps，消费 order 真实时间戳 + t() labels（与 P10 同源）
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
      <Header title="Order Details" />

      <ScrollView
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
                ORDER NUMBER
              </Text>
              <Text style={[styles.priceDisplay, { color: colors['on-surface'] }]}>
                {trackingNo}
              </Text>
              <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                Placed May 12, 2024
              </Text>
            </View>
            <StatusBadge text="PROCESSING" backgroundColor={statusTheme.badgeBg} />
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
              <Text style={[styles.etaLabel, { color: statusTheme.bannerLabelColor }]}>ESTIMATED DELIVERY</Text>
              <Text style={[styles.etaValue, { color: statusTheme.bannerValueColor }]}>
                Arriving Today 4:00 PM - 6:00 PM
              </Text>
            </View>
          </View>
        </View>

        {/* Map 占位区（Fix-21 #2 — react-native-maps 未装时用图占位） */}
        <MapPlaceholder />

        {/* 配送员信息卡片（Fix-21 #3 — 头像+名字+电话按钮） */}
        <CourierCard courier={COURIER} />

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
                Delivery Address
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/address/list')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit address"
            >
              <Text style={[styles.editText, { color: colors.primary }]}>EDIT</Text>
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
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>Order Items</Text>
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
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>Total Amount</Text>
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
              PAYMENT METHOD
            </Text>
            <View style={styles.paymentRow}>
              <View style={[styles.laisPayBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.laisPayText}>LaisPay</Text>
              </View>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>
                LaisPay Wallet
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
        <Pressable
          onPress={() => {
            /* 滚动到顶部 map 占位 */
          }}
          style={({ pressed }) => [
            styles.outlineBtn,
            { backgroundColor: colors['surface-container'] },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Track order"
        >
          <Text style={[styles.btnText, { color: colors.primary }]}>Track Order</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/service')}
          style={({ pressed }) => [
            styles.solidBtn,
            { backgroundColor: colors.primary },
            shadowPresets.umaLulik,
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Contact seller"
        >
          <Text style={[styles.btnText, { color: '#ffffff' }]}>Contact Seller</Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

// PrimaryHeader（HTML 第 138-155 行 — primary + tais-pattern + arrow_back + help + share）
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
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
        <Text style={styles.headerTitle} accessibilityRole="header">
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
            <Icon symbol="help_outline" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => {
              /* share */
            }}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Icon symbol="share" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 地图占位（Fix-21 #2 — react-native-maps 未装时用样式占位）
function MapPlaceholder() {
  const { colors } = useTheme();
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
      accessibilityLabel="Map showing delivery route"
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
      </View>

      <View style={styles.mapLabel}>
        <Icon symbol="location_on" size={12} color={colors.primary} />
        <Text style={[styles.mapLabelText, { color: colors['on-surface-variant'] }]}>
          Live tracking • Dili
        </Text>
      </View>
    </View>
  );
}

// 配送员卡片（Fix-21 #3）
function CourierCard({ courier }: { courier: typeof COURIER }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        styles.courierRow,
        { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
        shadowPresets.umaLulik,
      ]}
    >
      <View style={[styles.courierAvatar, { backgroundColor: colors['primary-container'] }]}>
        <Icon symbol="person" size={28} color={colors['on-primary']} />
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>{courier.name}</Text>
        <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
          {courier.vehicle}
        </Text>
        <View style={styles.ratingRow}>
          <Icon symbol="star" size={12} color={STAR_COLOR} />
          <Text style={[styles.ratingText, { color: colors['on-surface-variant'] }]}>
            {courier.rating.toFixed(1)} • On the way
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => Linking.openURL(`tel:${courier.phone.replace(/\s/g, '')}`)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.callBtn,
          { backgroundColor: colors.primary },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Call courier ${courier.name}`}
      >
        <Icon symbol="call" size={20} color="#ffffff" />
      </Pressable>
    </View>
  );
}

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
                <Icon symbol="check" size={10} color="#ffffff" />
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
    color: '#ffffff',
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
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  courierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    ...typography['body-sm'],
    fontSize: 12,
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#ffffff',
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
