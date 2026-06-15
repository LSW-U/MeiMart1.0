import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TimelineStep } from '@/components/business/TimelineStep';
import { useOrder, useCancelOrder } from '@/services/queries/useOrders';
import type { OrderStatus } from '@/types';

const STATUS_KEY_MAP: Record<OrderStatus, string> = {
  pending: 'order.status.pending',
  paid: 'order.status.paid',
  shipped: 'order.status.shipped',
  delivered: 'order.status.delivered',
  cancelled: 'order.status.cancelled',
  refunding: 'order.status.refunding',
};

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelMutation = useCancelOrder();

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

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title={t('order.detail')} showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError || !order) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title={t('order.detail')} showBack onBackPress={() => router.back()} />
        <ErrorState message={t('order.notFoundError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

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
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('order.detail')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: colors.primary }]} accessibilityRole="header">
              {t('order.statusLabel')}: {t(STATUS_KEY_MAP[order.status])}
            </Text>
            <Text style={[styles.orderNo, { color: colors['on-surface-variant'] }]}>
              {order.orderNo}
            </Text>
          </View>
        </Card>

        {order.address && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.shippingInfo')}
            </Text>
            <View style={styles.addressBox}>
              <Text style={[styles.addressLine, { color: colors['on-surface'] }]}>
                {order.address.name} {order.address.phone}
              </Text>
              <Text style={[styles.addressLine, { color: colors['on-surface-variant'] }]}>
                {order.address.province}
                {order.address.city}
                {order.address.district}
                {order.address.detail}
              </Text>
            </View>
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.items')}
          </Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={[styles.itemQty, { color: colors['on-surface-variant'] }]}>
                  x {item.quantity}
                </Text>
              </View>
              <PriceText value={item.product.price * item.quantity} size="md" />
            </View>
          ))}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('order.progress')}
          </Text>
          <TimelineStep steps={timelineSteps} currentIndex={1} />
        </Card>

        <Card>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors['on-surface-variant'] }]}>
              {t('order.total')}
            </Text>
            <PriceText value={order.totalPrice} size="lg" />
          </View>
        </Card>
      </ScrollView>
      {order.status === 'pending' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button
            label={t('order.actions.cancel')}
            variant="outline"
            onPress={cancel}
            testID="order-cancel"
          />
          <Button
            label={t('order.actions.pay')}
            variant="primary"
            onPress={() => router.push('/order/payment')}
            testID="order-pay"
          />
        </View>
      )}
      {order.status === 'shipped' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button
            label={t('order.actions.track')}
            variant="primary"
            onPress={() => router.push({ pathname: '/order/tracking', params: { id: order.id } })}
            testID="order-track"
          />
        </View>
      )}
      {order.status === 'delivered' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button
            label={t('order.actions.review')}
            variant="primary"
            onPress={() => router.push({ pathname: '/order/review', params: { id: order.id } })}
            testID="order-review"
          />
        </View>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusRow: { gap: spacing.xs },
  statusText: { ...typography.h3, fontWeight: '700' },
  orderNo: { ...typography['label-caps'] },
  sectionTitle: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  addressBox: { gap: spacing.xs },
  addressLine: { ...typography['body-sm'], lineHeight: 20 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemName: { ...typography['body-sm'] },
  itemQty: { ...typography['label-caps'] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { ...typography['body-md'] },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
