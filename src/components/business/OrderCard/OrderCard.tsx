import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import type { OrderStatus } from '@/types';
import type { OrderAction, OrderCardProps } from './OrderCard.types';
import { ORDER_STATUS_LABEL } from './OrderCard.types';

type StatusPill = { bg: string; fg: string };

const STATUS_PILL: Record<OrderStatus, StatusPill> = {
  pending: { bg: '#fef3c7', fg: '#b45309' }, // amber-100 / amber-700
  paid: { bg: '#dbeafe', fg: '#1d4ed8' }, // blue-100 / blue-700
  shipped: { bg: '#dbeafe', fg: '#1d4ed8' },
  delivered: { bg: '#d1fae5', fg: '#047857' }, // emerald-100 / emerald-700
  cancelled: { bg: '#fee2e2', fg: '#b91c1c' }, // red-100 / red-700
  refunding: { bg: '#fef3c7', fg: '#b45309' },
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
  const pill = STATUS_PILL[order.status];
  const actions = ACTIONS_BY_STATUS[order.status] ?? [];
  const thumbnails = order.items.slice(0, 3);
  const overflow = Math.max(0, order.items.length - 3);

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-lowest'] },
        shadowPresets.sm,
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
        <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.statusText, { color: pill.fg }]}>
            {ORDER_STATUS_LABEL[order.status]}
          </Text>
        </View>
      </View>

      <View style={styles.thumbRow}>
        {thumbnails.map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.product.image }}
            style={styles.thumb}
            accessible={false}
            accessibilityLabel={item.product.name}
          />
        ))}
        {overflow > 0 && (
          <View
            style={[
              styles.thumb,
              styles.thumbOverflow,
              { backgroundColor: colors['surface-container-high'] },
            ]}
          >
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              +{overflow}
            </Text>
          </View>
        )}
        <View style={styles.thumbSummary}>
          <Text
            style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}
            numberOfLines={1}
          >
            {order.items[0]?.product.name ?? ''}
            {order.items.length > 1 ? ` and ${order.items.length - 1} more` : ''}
          </Text>
          <PriceText value={order.totalPrice} size="md" />
        </View>
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
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusText: {
    ...textStyle('label-caps'),
    fontSize: 10,
    letterSpacing: 0.5,
  },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  thumbOverflow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbSummary: {
    flex: 1,
    marginLeft: spacing.xs,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
