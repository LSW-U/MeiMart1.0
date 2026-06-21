// ⚠️ 无 HTML 原型，参考 OrderListPage + OrderCard 推导实现，待设计确认
// OrderDetailPage — 订单详情（参考 OrderListPage.html 的 OrderCard 视觉风格 + 状态色块）
// 重构：ADR-0002 方案 C — 抽离 4 个 Section 组件复用（Items/PriceSummary/Address/Timeline）
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/format';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import {
  OrderItemsCard,
  OrderPriceSummaryCard,
  OrderAddressCard,
  OrderTimelineCard,
} from '@/components/business/order-sections';
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

const TIMELINE_CURRENT: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  cancelled: 0,
  refunding: 1,
};

export default function OrderDetailPage() {
  const { t, i18n } = useTranslation();
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

  const isCancelled = order.status === 'cancelled';
  const isRefunding = order.status === 'refunding';
  const timelineSteps =
    isCancelled || isRefunding
      ? [
          {
            status: t('order.timeline.submitted'),
            description: t('order.timeline.submittedDesc'),
            timestamp: '2026-06-01 10:30',
          },
          {
            status: t(`order.timeline.${order.status}`, { defaultValue: '' }),
            description: t(`order.timeline.${order.status}Desc`, { defaultValue: '' }),
            timestamp: '2026-06-01 18:00',
          },
        ]
      : [
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
        {/* 状态色块（OrderDetail 专属，不复用） */}
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
            <Text style={[styles.statusHint, { color: pill.fg, opacity: 0.85 }]} numberOfLines={1}>
              {t(`order.statusHint.${order.status}`, { defaultValue: '' })}
            </Text>
          </View>
        </View>

        {/* 收货地址卡片 */}
        {order.address && <OrderAddressCard address={order.address} />}

        {/* 商品列表卡片 */}
        <OrderItemsCard
          items={order.items}
          onItemPress={(item) => router.push(`/product/${item.product.id}`)}
        />

        {/* 进度时间轴卡片 */}
        <OrderTimelineCard steps={timelineSteps} currentIndex={TIMELINE_CURRENT[order.status]} />

        {/* 价格汇总卡片 */}
        <OrderPriceSummaryCard
          subtotal={subtotal}
          shipping={shippingFee}
          discount={discount}
          total={order.totalPrice}
        />

        {/* 订单号 + 时间信息（OrderDetail 专属，不复用） */}
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

      {/* 底部操作按钮栏（OrderDetail 专属，不复用） */}
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
  statusHint: {
    ...typography['body-sm'],
    fontSize: 11,
    marginTop: 2,
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
