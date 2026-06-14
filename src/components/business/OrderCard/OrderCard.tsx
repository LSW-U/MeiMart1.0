import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import { ProductItem } from '@/components/business/ProductItem';
import { Button } from '@/components/ui/Button';
import type { OrderAction, OrderCardProps } from './OrderCard.types';
import { ORDER_STATUS_LABEL } from './OrderCard.types';

const STATUS_COLOR: Record<string, string> = {
  pending: 'error',
  paid: 'primary',
  shipped: 'primary',
  delivered: 'tertiary',
  cancelled: 'on-surface-variant',
  refunding: 'warning',
};

const ACTIONS_BY_STATUS: Record<string, { label: string; action: OrderAction }[]> = {
  pending: [
    { label: 'Cancel', action: 'cancel' },
    { label: 'Pay Now', action: 'pay' },
  ],
  paid: [{ label: 'Track', action: 'track' }],
  shipped: [{ label: 'Track', action: 'track' }],
  delivered: [
    { label: 'After-Sales', action: 'after-sales' },
    { label: 'Review', action: 'review' },
  ],
  cancelled: [{ label: 'Repurchase', action: 'repurchase' }],
  refunding: [],
};

export function OrderCard({ order, onPress, onAction, testID }: OrderCardProps) {
  const { colors } = useTheme();
  const statusColorKey = STATUS_COLOR[order.status];
  const statusColor =
    statusColorKey === 'warning'
      ? colors.semantic.warning
      : ((colors[statusColorKey as keyof typeof colors] as string) ?? colors.primary);
  const actions = ACTIONS_BY_STATUS[order.status] ?? [];

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-low'] },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(order) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNo}, status ${ORDER_STATUS_LABEL[order.status]}`}
    >
      <View style={styles.header}>
        <Text
          style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}
          numberOfLines={1}
        >
          {order.orderNo}
        </Text>
        <Text style={[textStyle('label-caps'), { color: statusColor }]}>
          {ORDER_STATUS_LABEL[order.status]}
        </Text>
      </View>
      <View style={styles.items}>
        {order.items.slice(0, 3).map((item) => (
          <ProductItem key={item.id} item={item} />
        ))}
        {order.items.length > 3 && (
          <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
            +{order.items.length - 3} more
          </Text>
        )}
      </View>
      <View style={[styles.footer, { borderTopColor: colors['outline-variant'] }]}>
        <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>Total</Text>
        <PriceText value={order.totalPrice} size="md" />
      </View>
      {actions.length > 0 && onAction && (
        <View style={styles.actions}>
          {actions.map(({ label, action }) => (
            <Button
              key={action}
              label={label}
              variant={action === 'pay' ? 'primary' : 'outline'}
              size="sm"
              onPress={() => onAction(action, order)}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  items: { gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
