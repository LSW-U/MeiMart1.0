import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme, borderRadius, shadowPresets } from '@/theme';

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
        // P1-13：elevated 阴影改走 presets.card（原内联五参数已收编）；shadowColor 沿用 on-surface 色调
        elevated && [shadowPresets.card, { shadowColor: colors['on-surface'] }],
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
    // P1-9：容器卡两档约定之 lg(8)——原裸数字 8 收进 token
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
