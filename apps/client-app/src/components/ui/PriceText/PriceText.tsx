import { StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle } from '@/theme';
import type { TypographyKey } from '@/theme';

import type { PriceSize, PriceTextProps } from './PriceText.types';

const SIZE_TOKEN: Record<PriceSize, TypographyKey> = {
  sm: 'body-sm',
  md: 'body-md',
  lg: 'price-display',
};

function formatPrice(value: number, currency: string, decimals: number) {
  return `${currency}${value.toFixed(decimals)}`;
}

export function PriceText({
  value,
  currency = '$',
  size = 'md',
  originalPrice,
  strikeThroughOriginal = true,
  decimals = 2,
  testID,
}: PriceTextProps) {
  const { colors } = useTheme();
  const token = SIZE_TOKEN[size];
  const baseStyle = textStyle(token);

  const showOriginal = typeof originalPrice === 'number' && originalPrice > value;

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`Price ${formatPrice(value, currency, decimals)}${
        showOriginal ? `, original ${formatPrice(originalPrice as number, currency, decimals)}` : ''
      }`}
    >
      <Text
        style={[baseStyle, { color: colors.primary }]}
        testID={testID ? `${testID}-current` : undefined}
      >
        {formatPrice(value, currency, decimals)}
      </Text>
      {showOriginal && (
        <Text
          style={[
            textStyle('body-sm'),
            { color: colors.secondary },
            strikeThroughOriginal ? styles.strike : null,
          ]}
          testID={testID ? `${testID}-original` : undefined}
        >
          {formatPrice(originalPrice as number, currency, decimals)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  strike: {
    textDecorationLine: 'line-through',
  },
});
