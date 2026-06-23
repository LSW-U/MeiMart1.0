import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { toIconName } from '@/types';

import type { ChipProps } from './Chip.types';

export function Chip({ label, selected, onSelect, disabled = false, testID, icon }: ChipProps) {
  const { colors } = useTheme();

  const bg = selected ? colors.primary : colors['secondary-container'];
  const fg = selected ? colors['on-primary'] : colors['on-secondary-container'];

  return (
    <Pressable
      testID={testID}
      onPress={() => onSelect?.(!selected)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.content}>
        {icon && <MaterialCommunityIcons name={toIconName(icon)} size={16} color={fg} />}
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
