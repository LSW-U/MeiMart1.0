import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/theme';

import type { BadgeProps } from './Badge.types';

export function Badge({
  count = 0,
  variant = 'number',
  maxCount = 99,
  color,
  accessibilityLabel,
  style,
}: BadgeProps) {
  const { colors } = useTheme();

  if (count <= 0) {
    return null;
  }

  const bgColor = color ?? colors.primary;
  const displayCount = count > maxCount ? `${maxCount}+` : String(count);

  if (variant === 'dot') {
    return (
      <View
        testID="badge-dot"
        style={[styles.dot, { backgroundColor: bgColor }, style]}
        accessibilityLabel={accessibilityLabel ?? `New notification`}
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      testID="badge-number"
      style={[styles.number, { backgroundColor: bgColor }, style]}
      accessibilityLabel={accessibilityLabel ?? `${count} notifications`}
      accessibilityRole="image"
    >
      <Text style={[styles.label, { color: colors['on-primary'] }]}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    minWidth: 8,
    height: 8,
    borderRadius: 4,
    paddingHorizontal: 0,
  },
  number: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
