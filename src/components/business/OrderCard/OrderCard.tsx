import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer } from '@/i18n';
import { PriceText } from '@/components/ui/PriceText';
import { Button } from '@/components/ui/Button';
import type { OrderStatus } from '@/types';
import type { OrderAction, OrderCardProps } from './OrderCard.types';
import { ORDER_STATUS_LABEL } from './OrderCard.types';

type StatusPill = { bg: string; fg: string; dot: string };

const STATUS_PILL: Record<OrderStatus, StatusPill> = {
  pending: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' }, // amber
  paid: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' }, // blue
  shipped: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6' },
  delivered: { bg: '#d1fae5', fg: '#047857', dot: '#10b981' }, // emerald
  cancelled: { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444' }, // red
  refunding: { bg: '#fef3c7', fg: '#b45309', dot: '#f59e0b' },
};

export function OrderCard({ order, onPress, onAction, testID }: OrderCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  const pill = STATUS_PILL[order.status];
  const thumbnails = order.items.slice(0, 2);
  const overflow = Math.max(0, order.items.length - 2);

  const actions = ACTIONS_BY_STATUS(order.status);

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.sm,
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(order) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNo}, status ${ORDER_STATUS_LABEL[order.status]}`}
    >
      <View style={[styles.header, { borderBottomColor: colors['outline-variant'] }]}>
        <View style={styles.headerLeft}>
          <Text style={[textStyle('label-caps'), { color: colors.primary, fontSize: 10 }]}>
            #{order.orderNo}
          </Text>
          <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
            {order.createdAt}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: pill.dot }]} />
            <Text style={[textStyle('label-caps'), { color: pill.fg, fontSize: 10 }]}>
              {ORDER_STATUS_LABEL[order.status]}
            </Text>
          </View>
          {onAction && (
            <Pressable
              onPress={() => onAction('cancel', order)}
              hitSlop={8}
              style={[styles.deleteBtn, { backgroundColor: colors['error-container'] }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.thumbRow}>
          {thumbnails.map((item) => (
            <View
              key={item.id}
              style={[
                styles.thumb,
                {
                  backgroundColor: colors['surface-container'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              <Image
                source={{ uri: item.product.image }}
                style={styles.thumbImg}
                accessible={false}
                accessibilityLabel={localize(item.product.name)}
              />
            </View>
          ))}
          {overflow > 0 && (
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: colors['surface-container'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              <Text
                style={[
                  textStyle('label-caps'),
                  { color: colors['on-surface-variant'], fontSize: 10 },
                ]}
              >
                +{overflow} ITEM
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.totalBox}>
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {t('order.total')}
            </Text>
            <PriceText value={order.totalPrice} size="md" />
          </View>
          {actions.length > 0 && onAction && (
            <View style={styles.actions}>
              {actions.map(({ label, action, primary }) => (
                <Button
                  key={action}
                  label={label}
                  variant={primary ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => onAction(action, order)}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ACTIONS_BY_STATUS(status: OrderStatus): {
  label: string;
  action: OrderAction;
  primary?: boolean;
}[] {
  switch (status) {
    case 'pending':
      return [
        { label: 'Cancel', action: 'cancel' },
        { label: 'Pay Now', action: 'pay', primary: true },
      ];
    case 'paid':
      return [{ label: 'Details', action: 'track' }];
    case 'shipped':
      return [{ label: 'Track', action: 'track', primary: true }];
    case 'delivered':
      return [
        { label: 'After-Sales', action: 'after-sales' },
        { label: 'Review', action: 'review', primary: true },
      ];
    case 'cancelled':
      return [{ label: 'Buy Again', action: 'repurchase', primary: true }];
    case 'refunding':
      return [];
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius['2xl'],
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalBox: {
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
