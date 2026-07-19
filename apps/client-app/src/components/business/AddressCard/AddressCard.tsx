import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import { Checkbox } from '@/components/ui/Checkbox';
import type { AddressCardProps } from './AddressCard.types';

function AddressCardBase({
  address,
  onPress,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelect,
  testID,
}: AddressCardProps) {
  const { colors } = useTheme();
  const fullAddress = `${address.province}${address.city}${address.district}${address.detail}`;

  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: colors['surface-container-low'] }]}
    >
      {/* Why: 外层用 View 而非 Pressable，避免 Pressable 嵌套 Pressable/Checkbox
          （RN Web 渲染为 <button> 嵌套 <button>，违反 HTML 规范导致 hydration 错误） */}
      <Pressable
        onPress={onPress ? () => onPress(address) : undefined}
        disabled={!onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`Address for ${address.name}, ${fullAddress}`}
      >
        {selectable && (
          <Checkbox
            checked={selected}
            onPress={() => onSelect?.(address)}
            accessibilityLabel="Select this address"
          />
        )}
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text
              style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}
            >
              {address.name}
            </Text>
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {address.phone}
            </Text>
            {address.isDefault && (
              <View style={[styles.defaultTag, { backgroundColor: colors['primary-container'] }]}>
                <Text
                  style={[
                    textStyle('label-caps'),
                    { color: colors['on-primary-container'], fontSize: 10 },
                  ]}
                >
                  Default
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}
            numberOfLines={2}
          >
            {fullAddress}
          </Text>
        </View>
      </Pressable>
      {(onEdit || onDelete) && (
        <View style={[styles.actions, { borderTopColor: colors['outline-variant'] }]}>
          {onEdit && (
            <Pressable
              onPress={() => onEdit(address)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit address"
              style={styles.actionBtn}
            >
              <MaterialCommunityIcons name="pencil" size={18} color={colors.primary} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={() => onDelete(address)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Delete address"
              style={styles.actionBtn}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export const AddressCard = memo(AddressCardBase);

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  body: { flex: 1, gap: 4 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  defaultTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  actionBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
