import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { PriceText } from '@/components/ui/PriceText';
import { Checkbox } from '@/components/ui/Checkbox';
import type { CartItemRowProps } from './CartItemRow.types';

export function CartItemRow({
  item,
  onPress,
  onQuantityChange,
  onDelete,
  showControls = true,
  testID,
}: CartItemRowProps) {
  const { colors } = useTheme();
  const { product, quantity, selected } = item;

  return (
    <View
      testID={testID}
      style={[styles.row, { backgroundColor: colors['surface-container-lowest'] }]}
    >
      {showControls && (
        <Checkbox
          checked={selected}
          onPress={() => onPress?.(item)}
          accessibilityLabel="Select item"
        />
      )}
      <Image source={{ uri: product.image }} style={styles.image} accessible={false} />
      <View style={styles.info}>
        <Text
          style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {product.name}
        </Text>
        <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
          {product.category}
        </Text>
        <View style={styles.bottomRow}>
          <PriceText value={product.price} size="sm" />
          {showControls && onQuantityChange && (
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
                hitSlop={8}
                style={styles.qtyBtn}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <MaterialCommunityIcons name="minus" size={16} color={colors.primary} />
              </Pressable>
              <Text style={[textStyle('body-md'), { color: colors['on-surface'] }]}>
                {quantity}
              </Text>
              <Pressable
                onPress={() => onQuantityChange(quantity + 1)}
                hitSlop={8}
                style={styles.qtyBtn}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
              </Pressable>
            </View>
          )}
          {!showControls && (
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              × {quantity}
            </Text>
          )}
        </View>
      </View>
      {showControls && onDelete && (
        <Pressable
          onPress={() => onDelete(item)}
          hitSlop={8}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete item"
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  image: { width: 80, height: 80, borderRadius: borderRadius.sm },
  info: { flex: 1, gap: 4 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
