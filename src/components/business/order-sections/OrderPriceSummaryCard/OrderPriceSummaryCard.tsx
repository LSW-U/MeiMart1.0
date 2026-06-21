import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, shadowPresets } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import type { OrderPriceSummaryCardProps } from './OrderPriceSummaryCard.types';

export function OrderPriceSummaryCard({
  subtotal,
  shipping,
  discount,
  total,
  title,
  testID,
}: OrderPriceSummaryCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerTitle = title ?? t('order.priceSummary', { defaultValue: 'Price Summary' });

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: colors['surface-container-lowest'] },
        shadowPresets.sm,
      ]}
    >
      <View style={styles.cardHeader}>
        <Icon symbol="receipt_long" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>{headerTitle}</Text>
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
          ${shipping.toFixed(2)}
        </Text>
      </View>

      {discount !== undefined && (
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors['on-surface-variant'] }]}>
            {t('order.discount', { defaultValue: 'Discount' })}
          </Text>
          <View style={[styles.discountPill, { backgroundColor: '#f0fdf4' }]}>
            <Text style={styles.discountText}>-${discount.toFixed(2)}</Text>
          </View>
        </View>
      )}

      <View style={[styles.priceTotalRow, { borderTopColor: colors['outline-variant'] }]}>
        <Text style={[styles.priceTotalLabel, { color: colors['on-surface'] }]}>
          {t('order.total')}
        </Text>
        <PriceText value={total} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.md,
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
    borderTopWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  priceTotalLabel: {
    ...typography['body-md'],
    fontWeight: '700',
    fontSize: 16,
  },
});
