import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { useLocalizer } from '@/i18n';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import type { OrderItemsCardProps } from './OrderItemsCard.types';

export function OrderItemsCard({ items, title, onItemPress, testID }: OrderItemsCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  const headerTitle = title ?? t('order.items');

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
        <Icon symbol="shopping_cart" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>{headerTitle}</Text>
      </View>
      {items.map((item) => {
        const row = (
          <View style={styles.itemInner}>
            <View style={[styles.itemImageWrap, { backgroundColor: colors['surface-container'] }]}>
              <Image
                source={{ uri: item.product.image }}
                style={styles.itemImage}
                resizeMode="cover"
                accessible={false}
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
        );

        if (onItemPress) {
          return (
            <Pressable
              key={item.id}
              onPress={() => onItemPress(item)}
              style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${t('order.itemViewLabel', { defaultValue: 'View product' })}: ${localize(item.product.name)}`}
            >
              {row}
            </Pressable>
          );
        }
        return (
          <View key={item.id} style={styles.itemRow}>
            {row}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
  itemRow: {
    paddingVertical: spacing.sm,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  pressed: {
    opacity: 0.7,
  },
});
