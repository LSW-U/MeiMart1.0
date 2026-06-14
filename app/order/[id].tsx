import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

const TIMELINE_STEPS = [
  { status: '订单已提交', description: '等待买家付款', timestamp: '2026-06-01 10:30' },
  { status: '买家已付款', description: '商家准备发货', timestamp: '2026-06-01 11:00' },
  { status: '商家已发货', description: '包裹已出库', timestamp: '2026-06-02 08:00' },
  { status: '已签收', description: '包裹已送达', timestamp: '2026-06-03 14:00' },
];

export default function OrderDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelMutation = useCancelOrder();

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title="订单详情" showBack onBackPress={() => router.back()} />
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
        <PageHeader title="订单详情" showBack onBackPress={() => router.back()} />
        <ErrorState message="订单不存在或加载失败" onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const cancel = () => {
    Alert.alert('确认取消', '确定取消此订单？', [
      { text: '不', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(order.id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="订单详情" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, { color: colors.primary }]} accessibilityRole="header">
              订单状态: {order.status}
            </Text>
            <Text style={[styles.orderNo, { color: colors['on-surface-variant'] }]}>
              {order.orderNo}
            </Text>
          </View>
        </Card>

        {order.address && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>收货信息</Text>
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
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>商品</Text>
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
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>订单进度</Text>
          <TimelineStep steps={TIMELINE_STEPS} currentIndex={1} />
        </Card>

        <Card>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors['on-surface-variant'] }]}>
              订单总额
            </Text>
            <PriceText value={order.totalPrice} size="lg" />
          </View>
        </Card>
      </ScrollView>
      {order.status === 'pending' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button label="取消订单" variant="outline" onPress={cancel} testID="order-cancel" />
          <Button
            label="去支付"
            variant="primary"
            onPress={() => router.push('/order/payment')}
            testID="order-pay"
          />
        </View>
      )}
      {order.status === 'shipped' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button
            label="查看物流"
            variant="primary"
            onPress={() => router.push({ pathname: '/order/tracking', params: { id: order.id } })}
            testID="order-track"
          />
        </View>
      )}
      {order.status === 'delivered' && (
        <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
          <Button
            label="去评价"
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
