import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

import type { CardProps } from './Card.types';

export function Card({
  children,
  onPress,
  elevated = false,
  padding = 16,
  style,
  testID,
  accessibilityLabel,
}: CardProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-low'],
          borderColor: colors['outline-variant'],
          padding,
        },
        elevated && styles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
