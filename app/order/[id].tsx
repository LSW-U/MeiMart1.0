// ⚠️ 无 HTML 原型，参考 OrderListPage + OrderCard 推导实现，待设计确认
// OrderDetailPage — 订单详情（参考 OrderListPage.html 的 OrderCard 视觉风格 + 状态色）
// D.3: PrimaryHeader + 状态色块 + 商品列表 + 时间轴 + 价格汇总 + 操作按钮
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { formatDate } from '@/utils/format';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PriceText } from '@/components/ui/PriceText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { TimelineStep } from '@/components/business/TimelineStep';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import { ORDER_STATUS_LABEL } from '@/components/business/OrderCard/OrderCard.types';
import type { OrderStatus } from '@/types';

type StatusPill = { bg: string; fg: string; dot: string };

const STATUS_PILL: Record<OrderStatus, StatusPill> = {
  pending: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
  paid: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  shipped: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  delivered: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' },
  cancelled: { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444' },
  refunding: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
};

const STATUS_ICON: Record<OrderStatus, string> = {
  pending: 'schedule',
  paid: 'check_circle',
  shipped: 'local_shipping',
  delivered: 'verified',
  cancelled: 'cancel',
  refunding: 'history',
};

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
        <PrimaryHeader title={t('order.detail')} showBack onBackPress={() => router.back()} />
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
        <PrimaryHeader title={t('order.detail')} showBack onBackPress={() => router.back()} />
        <ErrorState message={t('order.notFoundError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const pill = STATUS_PILL[order.status];
  const shippingFee = 2.0;
  const discount = 5.0;
  const subtotal = order.totalPrice + discount - shippingFee;

  const timelineSteps = [
    {
      status: t('order.timeline.submitted'),
      description: t('order.timeline.submittedDesc'),
      timestamp: '2026-06-01 10:30',
    },
    {
      status: t('order.timeline.paid'),
      description: t('order.timeline.paidDesc'),
      timestamp: '2026-06-01 11:00',
    },
    {
      status: t('order.timeline.shipped'),
      description: t('order.timeline.shippedDesc'),
      timestamp: '2026-06-02 08:00',
    },
    {
      status: t('order.timeline.delivered'),
      description: t('order.timeline.deliveredDesc'),
      timestamp: '2026-06-03 14:00',
    },
  ];

  const timelineCurrentMap: Record<OrderStatus, number> = {
    pending: 0,
    paid: 1,
    shipped: 2,
    delivered: 3,
    cancelled: 0,
    refunding: 1,
  };

  const cancel = () => {
    Alert.alert(t('order.cancelTitle'), t('order.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.confirm'),
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
      <PrimaryHeader
        title={t('order.detail')}
        showBack
        onBackPress={() => router.back()}
        rightActions={
          <Pressable
            onPress={() => router.push('/service')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Customer service"
          >
            <Icon symbol="headset" size={22} color="#ffffff" />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 状态色块（参考 OrderCard 的 STATUS_PILL） */}
        <View style={[styles.statusBlock, { backgroundColor: pill.bg }, shadowPresets.sm]}>
          <View style={styles.statusPattern} pointerEvents="none">
            <TaisPattern width={400} height={100} opacity={0.2} />
          </View>
          <View style={styles.statusIconWrap}>
            <View style={[styles.statusIcon, { backgroundColor: pill.dot }]}>
              <Icon symbol={STATUS_ICON[order.status]} size={22} color="#ffffff" />
            </View>
          </View>
          <View style={styles.statusTextBox}>
            <Text style={[styles.statusText, { color: pill.fg }]} accessibilityRole="header">
              {ORDER_STATUS_LABEL[order.status]}
            </Text>
            <Text style={[styles.orderNo, { color: pill.fg, opacity: 0.7 }]}>#{order.orderNo}</Text>
          </View>
        </View>

        {/* 收货地址卡片 */}
        {order.address && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors['surface-container-lowest'] },
              shadowPresets.sm,
            ]}
          >
            <View style={styles.cardHeader}>
              <Icon symbol="location_on" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('order.shippingInfo')}
              </Text>
            </View>
            <View style={styles.addressBox}>
              <View style={styles.addressTopRow}>
                <Text style={[styles.addressName, { color: colors['on-surface'] }]}>
                  {order.address.name}
                </Text>
                <Text style={[styles.addressPhone, { color: colors['on-surface-variant'] }]}>
                  {order.address.phone}
                </Text>
              </View>
              <Text style={[styles.addressLine, { color: colors['on-surface-variant'] }]}>
                {order.address.province}
                {order.address.city}
                {order.address.district}
                {order.address.detail}
              </Text>
            </View>
          </View>
        )}

        {/* 商品列表卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="shopping_cart" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.items')}
            </Text>
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View
                style={[styles.itemImageWrap, { backgroundColor: colors['surface-container'] }]}
              >
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                  resizeMode="cover"
                  accessible
                  accessibilityLabel={localize(item.product.name)}
                />
              </View>
              <View style={styles.itemTextBox}>
                <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                  {localize(item.product.name)}
                </Text>
                <Text style={[styles.itemPrice, { color: colors['on-surface-variant'] }]}>
                  ${item.product.price.toFixed(2)} × {item.quantity}
                </Text>
              </View>
              <PriceText value={item.product.price * item.quantity} size="md" />
            </View>
          ))}
        </View>

        {/* 进度时间轴卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="timeline" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.progress')}
            </Text>
          </View>
          <TimelineStep steps={timelineSteps} currentIndex={timelineCurrentMap[order.status]} />
        </View>

        {/* 价格汇总卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="receipt_long" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.priceSummary', { defaultValue: 'Price Summary' })}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors['on-surface-variant'] }]}>
              {t('order.subtotal', { defaultValue: 'Subtotal' })}
            </Text>
            <Text style={[styles.priceValue, { color: colors['on-surface'] }]}>
              ${subtotal.toFixed(2)}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors['on-surface-variant'] }]}>
              {t('order.shipping', { defaultValue: 'Shipping' })}
            </Text>
            <Text style={[styles.priceValue, { color: colors['on-surface'] }]}>
              ${shippingFee.toFixed(2)}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors['on-surface-variant'] }]}>
              {t('order.discount', { defaultValue: 'Discount' })}
            </Text>
            <View style={[styles.discountPill, { backgroundColor: '#f0fdf4' }]}>
              <Text style={styles.discountText}>-${discount.toFixed(2)}</Text>
            </View>
          </View>

          <View style={[styles.priceTotalRow, { borderTopColor: colors['outline-variant'] }]}>
            <Text style={[styles.priceTotalLabel, { color: colors['on-surface'] }]}>
              {t('order.total')}
            </Text>
            <PriceText value={order.totalPrice} size="lg" />
          </View>
        </View>

        {/* 订单号 + 时间信息 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="receipt_long" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.applyInfo', { defaultValue: 'Order Info' })}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                {t('order.orderNo', { defaultValue: 'Order No.' })}
              </Text>
              <Text style={[styles.metaValue, { color: colors['on-surface'] }]}>
                {order.orderNo}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                {t('order.createdAtLabel', { defaultValue: 'Created At' })}
              </Text>
              <Text style={[styles.metaValue, { color: colors['on-surface'] }]}>
                {formatDate(order.createdAt, i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
              </Text>
            </View>
            {order.trackingNo && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors['on-surface-variant'] }]}>
                  {t('order.trackingNo', { defaultValue: 'Tracking No.' })}
                </Text>
                <Text style={[styles.metaValue, { color: colors.primary }]}>
                  {order.trackingNo}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 底部操作按钮栏 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        {order.status === 'pending' && (
          <>
            <ActionBtn
              label={t('order.actions.cancel')}
              onPress={cancel}
              variant="outline"
              color={colors.primary}
              fgColor={colors.primary}
              testID="order-cancel"
            />
            <ActionBtn
              label={t('order.actions.pay')}
              onPress={() => router.push('/order/checkout')}
              variant="primary"
              color={colors.primary}
              fgColor="#ffffff"
              testID="order-pay"
              primary
            />
          </>
        )}
        {order.status === 'shipped' && (
          <>
            <ActionBtn
              label={t('order.actions.track', { defaultValue: 'Track Order' })}
              onPress={() => router.push({ pathname: '/order/tracking', params: { id: order.id } })}
              variant="outline"
              color={colors.primary}
              fgColor={colors.primary}
              testID="order-track"
            />
            <ActionBtn
              label={t('order.actions.confirm', { defaultValue: 'Confirm Received' })}
              onPress={() => router.back()}
              variant="primary"
              color={colors.primary}
              fgColor="#ffffff"
              testID="order-confirm"
              primary
            />
          </>
        )}
        {order.status === 'delivered' && (
          <>
            <ActionBtn
              label={t('order.actions.afterSales', { defaultValue: 'After-Sales' })}
              onPress={() =>
                router.push({ pathname: '/order/after-sales-apply', params: { id: order.id } })
              }
              variant="outline"
              color={colors.primary}
              fgColor={colors.primary}
              testID="order-after-sales"
            />
            <ActionBtn
              label={t('order.actions.review')}
              onPress={() => router.push({ pathname: '/order/review', params: { id: order.id } })}
              variant="primary"
              color={colors.primary}
              fgColor="#ffffff"
              testID="order-review"
              primary
            />
          </>
        )}
        {order.status === 'cancelled' && (
          <ActionBtn
            label={t('order.actions.repurchase', { defaultValue: 'Buy Again' })}
            onPress={() => router.replace('/(main)/home')}
            variant="primary"
            color={colors.primary}
            fgColor="#ffffff"
            testID="order-repurchase"
            fullWidth
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}

function ActionBtn({
  label,
  onPress,
  variant,
  color,
  fgColor,
  testID,
  fullWidth = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  variant: 'primary' | 'outline';
  color: string;
  fgColor: string;
  testID: string;
  fullWidth?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        fullWidth && styles.actionBtnFull,
        primary && styles.actionBtnPrimary,
        {
          backgroundColor: variant === 'primary' ? color : 'transparent',
          borderColor: variant === 'outline' ? color : 'transparent',
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.actionText, { color: fgColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: 120,
    gap: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  statusPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusIconWrap: {
    zIndex: 2,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextBox: {
    flex: 1,
    gap: 2,
    zIndex: 2,
  },
  statusText: {
    ...typography.h3,
    fontWeight: '700',
  },
  orderNo: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  addressBox: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  addressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  addressName: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  addressPhone: {
    ...typography['body-sm'],
  },
  addressLine: {
    ...typography['body-sm'],
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemImageWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemTextBox: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    ...typography['body-sm'],
    lineHeight: 18,
  },
  itemPrice: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    ...typography['body-sm'],
  },
  priceValue: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  discountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  priceTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceTotalLabel: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  metaBox: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metaLabel: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  metaValue: {
    ...typography['body-sm'],
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtnFull: {
    flex: 1,
  },
  actionBtnPrimary: {
    flex: 1.5,
  },
  actionText: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
});
