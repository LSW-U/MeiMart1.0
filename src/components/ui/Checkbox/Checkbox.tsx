import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

import type { CheckboxProps } from './Checkbox.types';

export function Checkbox({ checked, onChange, label, disabled = false, testID }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? 'Checkbox'}
      accessibilityState={{ checked, disabled }}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? colors.primary : 'transparent',
            borderColor: checked ? colors.primary : colors.outline,
          },
        ]}
      >
        {checked && <MaterialCommunityIcons name="check" size={18} color={colors['on-primary']} />}
      </View>
      {label && <Text style={[styles.label, { color: colors['on-surface'] }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 8,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
});
