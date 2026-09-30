import { StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle } from '@/theme';
import { useTranslation } from 'react-i18next';
import type { TypographyKey } from '@/theme';
import { formatPrice as formatPriceUtil } from '@/utils/format';

import type { PriceSize, PriceTextProps } from './PriceText.types';

const SIZE_TOKEN: Record<PriceSize, TypographyKey> = {
  sm: 'body-sm',
  md: 'body-md',
  lg: 'price-display',
};

// C-P2-1: 统一走 utils/format.formatPrice（Intl 美式千分位 + ISO 代码→符号映射），
// 消灭本组件内 toFixed 自拼与 format.ts 两套口径。currency 兼容 ISO 代码与单字符符号
// （旧调用方默认 '$'），映射规则收口在 format.ts。
function formatPrice(value: number, currency: string, decimals: number) {
  return formatPriceUtil(value, currency, decimals);
}

export function PriceText({
  value,
  currency = '$',
  size = 'md',
  originalPrice,
  strikeThroughOriginal = true,
  decimals = 2,
  testID,
  style,
}: PriceTextProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const token = SIZE_TOKEN[size];
  const baseStyle = textStyle(token);

  const showOriginal = typeof originalPrice === 'number' && originalPrice > value;
  // C-P3-1（批4）：a11y 骨架 i18n 化（原英文模板串）
  const a11yLabel = showOriginal
    ? `${t('product.a11y.price', { price: formatPrice(value, currency, decimals) })}, ${t(
        'product.a11y.priceOriginal',
        { price: formatPrice(originalPrice as number, currency, decimals) },
      )}`
    : t('product.a11y.price', { price: formatPrice(value, currency, decimals) });

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <Text
        style={[baseStyle, { color: colors.primary }, style]}
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
