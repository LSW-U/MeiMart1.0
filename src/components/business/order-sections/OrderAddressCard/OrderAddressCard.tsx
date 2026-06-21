import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { OrderAddressCardProps } from './OrderAddressCard.types';

export function OrderAddressCard({
  address,
  title,
  onEdit,
  editLabel,
  testID,
}: OrderAddressCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerTitle = title ?? t('order.shippingInfo');
  const edit = editLabel ?? t('checkout.address.change', { defaultValue: 'Change' });

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
        <Icon symbol="location_on" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors['on-surface'], flex: 1 }]}>
          {headerTitle}
        </Text>
        {onEdit && (
          <Text
            onPress={onEdit}
            style={[styles.editLink, { color: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={edit}
          >
            {edit}
          </Text>
        )}
      </View>
      <View style={styles.addressBox}>
        <View style={styles.addressTopRow}>
          <Text style={[styles.addressName, { color: colors['on-surface'] }]}>{address.name}</Text>
          <Text style={[styles.addressPhone, { color: colors['on-surface-variant'] }]}>
            {address.phone}
          </Text>
        </View>
        <Text style={[styles.addressLine, { color: colors['on-surface-variant'] }]}>
          {address.province}
          {address.city}
          {address.district}
          {address.detail}
        </Text>
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
  editLink: {
    ...typography['label-caps'],
    fontSize: 12,
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
});
