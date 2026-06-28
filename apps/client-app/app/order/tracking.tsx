// DeliveryTrackingPage — 还原自 DeliveryTrackingPage.html（328 行）
// HTML 行数 328 → RN ~430（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-21: PrimaryHeader + tais-pattern + 地图占位 + 骑手卡 + 渐变进度条 + uma-lulik-shadow + 费用明细
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PriceText } from '@/components/ui/PriceText';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { StatusBadge } from '@/components/business/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useOrderTracking } from '@/services/queries/useTracking';

interface OrderItemRow {
  id: string;
  name: string;
  spec: string;
  qty: number;
  price: number;
  image: string;
}

const ORDER_ITEMS: OrderItemRow[] = [
  {
    id: 'item-1',
    name: 'Premium Ermera Arabica',
    spec: '500g Bag',
    qty: 1,
    price: 12.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAQ-PIW45qe44Mil-vVxoB9al6-whuUMeLWWyN-rNHtGr3v6z5WFP_CLT4Z9htPdpqwLS4Ps7-hzyxKS2d9iu_RU6NMYSpfx7_3qFODzZmYVGudN6juccoBHW2o2xr6fjL_zTvCqO-oC08IXgp2Wl0TjvtrYNzITjgz3yCaAO9G73s18bEt1Hl6_dJhacKvTuLhy7N2_hL7SwgHYo-u_rE2MnU-0Bu_Sk51UwyzHt7scLsEtH6Tvgttl4NQQwMlH9aRad_dA9L6',
  },
  {
    id: 'item-2',
    name: 'Foos Lafaek Rice',
    spec: '5kg Bag',
    qty: 1,
    price: 4.8,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDJUu9O-Gtf8oI_7UVUeOx8CugOCjZ_0Hn7ya3KFHeSOHbWqkMuB78Um_5W-n29zwXufHvVcDTtxgXHzCTLw4FEGnXHxYBk21PsjR2nsjFKEUMjgo8Kwu1kLyvn6pjIJJoHOcDS1r1JohsxpvD3mUSoJ-L6ul-HuVHOig_XBq6DreiK99XS_8esCzPjLh8BFKRRXzpA9yx4AhYzOG5Z0XY2OI0chYjRKq1czOSmJUpXoALUpGqRPPmdx9pennzphJ3qGcKaECM5',
  },
  {
    id: 'item-3',
    name: 'Organic Wild Honey',
    spec: '250ml Jar',
    qty: 2,
    price: 15.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCSSlrYR3JN_TaWryZud85z9dwY2i1oQD2A5YShNc5a2jxIot7zfScECTALw4ybW_Q7P6KStFPJR8Ggc7eFCjbncuHFyW_XMiBKp_HUqApMCRkofg_tKtFqQc3ufvi1oBg0K6Z956qBoVnWo2Tl7TlSK5zXPK2OUpzXekMb9dsWa9Tv3hVl-nwaVvF4IxVpiaW6JH14wgLBgsNta5RJmC3anaS5NuwNdXZqCVIYFGlV3Oa46lpNuQLG6ke--CdgT71sX6pfksP0',
  },
];

// 配送员 mock（HTML 同款）
const COURIER = {
  name: 'João Pereira',
  vehicle: 'Scooter • TL-2024-DL',
  phone: '+670 7712 3456',
  rating: 4.9,
};

// 物流时间线 mock（HTML 第 268-292 行：3 steps，current 在 Processing）
const TIMELINE = [
  {
    id: 't1',
    status: 'Order Confirmed',
    time: 'May 12, 2024 • 10:30 AM',
    state: 'completed' as const,
  },
  {
    id: 't2',
    status: 'Processing',
    time: 'May 12, 2024 • 11:45 AM',
    state: 'active' as const,
  },
  {
    id: 't3',
    status: 'Shipped',
    time: 'Pending',
    state: 'pending' as const,
  },
];

export default function DeliveryTrackingPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const trackingNo = params.id ? `MEI-${params.id.padStart(5, '0')}` : 'MEI-98234';
  // Why: Phase 6 启动 WS 配送追踪（join:order + 监听 order:location/order:status-changed + 5s 无消息降级 HTTP 轮询）。
  // UI 暂保留 mock 数据（ORDER_ITEMS/TIMELINE），后续迭代再接入真实 tracking.riderLocation/lastOrderStatus。
  useOrderTracking(params.id);

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
            { backgroundColor: colors['surface-container-lowest'] },
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
            <StatusBadge text="PROCESSING" backgroundColor="#F97316" />
          </View>

          {/* ESTIMATED DELIVERY（HTML 第 168-174 行 — blue-50/50 bg） */}
          <View
            style={[
              styles.etaRow,
              {
                backgroundColor: 'rgba(59,130,246,0.08)',
                borderColor: 'rgba(59,130,246,0.25)',
              },
            ]}
          >
            <Icon symbol="local_shipping" size={20} color="#1d4ed8" />
            <View style={styles.flex1}>
              <Text style={[styles.etaLabel, { color: '#1e3a8a' }]}>ESTIMATED DELIVERY</Text>
              <Text style={[styles.etaValue, { color: '#0c2461' }]}>
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
            { backgroundColor: colors['surface-container-lowest'] },
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
              onPress={() => router.push('/address')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit address"
            >
              <Text style={[styles.editText, { color: colors.primary }]}>EDIT</Text>
            </Pressable>
          </View>
          <View style={styles.addressBody}>
            <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>Maria Silva</Text>
            <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
              Rua de Christo Rei, Dili, Timor-Leste
            </Text>
          </View>
        </View>

        {/* Order Items 标题（HTML 第 191-196 行 — 渐变 divider） */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDivider, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>Order Items</Text>
          <View style={[styles.sectionDivider, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
        </View>

        {/* 商品列表（HTML 第 198-237 行 — 3 items） */}
        <View style={styles.itemList}>
          {ORDER_ITEMS.map((item) => (
            <View
              key={item.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: 'rgba(141,112,108,0.2)',
                },
              ]}
            >
              <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-variant'] }]}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              </View>
              <View style={styles.itemInfo}>
                <View>
                  <Text
                    style={[styles.itemName, { color: colors['on-surface'] }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.bodySm, { color: colors['on-surface-variant'] }]}>
                    {item.spec} • Qty: {item.qty}
                  </Text>
                </View>
                <PriceText value={item.price} size="lg" />
              </View>
            </View>
          ))}
        </View>

        {/* Order Summary（HTML 第 240-258 行） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.umaLulik,
          ]}
        >
          <Text style={[styles.labelCaps, { color: colors['on-surface-variant'] }]}>
            ORDER SUMMARY
          </Text>
          <View style={styles.summaryGap}>
            <SummaryRow label="Subtotal" value="$32.30" color={colors['on-surface']} />
            <SummaryRow label="Delivery Fee" value="$1.50" color={colors['on-surface']} />
            <SummaryRow label="Discount" value="-$2.00" color="#059669" />
            <View style={[styles.totalRow, { borderTopColor: 'rgba(141,112,108,0.3)' }]}>
              <Text style={[styles.bodyMdBold, { color: colors['on-surface'] }]}>Total Amount</Text>
              <Text style={[styles.priceDisplay, { color: colors.primary, fontSize: 24 }]}>
                $31.80
              </Text>
            </View>
          </View>
        </View>

        {/* Payment & Timeline Card（HTML 第 260-293 行） */}
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
          <Timeline />
        </View>
      </ScrollView>

      {/* Sticky Action Buttons（HTML 第 296-305 行 — Track Order + Contact Seller） */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: 'rgba(141,112,108,0.2)',
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
          borderColor: 'rgba(141,112,108,0.2)',
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
        { backgroundColor: colors['surface-container-lowest'] },
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
          <Icon symbol="star" size={12} color="#f59e0b" />
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

// 渐变进度条 / Timeline（Fix-21 #4 + HTML 第 268-292 行）
function Timeline() {
  const { colors } = useTheme();
  return (
    <View style={styles.timelineWrap}>
      {/* 竖线（背景 + primary 上半段） */}
      <View style={[styles.timelineBgLine, { backgroundColor: 'rgba(141,112,108,0.3)' }]} />
      <View style={[styles.timelineActiveLine, { backgroundColor: colors.primary }]} />

      {TIMELINE.map((step) => {
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
      <Text style={[styles.bodySm, { color: color }]}>{label}</Text>
      <Text style={[styles.bodySm, { color, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
    gap: spacing.md,
    paddingBottom: 120,
  },
  flex1: {
    flex: 1,
  },
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
    height: '40%',
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
