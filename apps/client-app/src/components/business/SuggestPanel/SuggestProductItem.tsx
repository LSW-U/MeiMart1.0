import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PriceText } from '@/components/ui/PriceText';
import type { Product } from '@/types';

export interface SuggestProductItemProps {
  product: Product;
  onPress: () => void;
  testID?: string;
}

/**
 * 商品联想项（方案 §7.2，✅ 新建拍板）：
 * - 行高 56px：[48×48 图 圆角 4px][名称 2 行 14px + 价格 14px 红]
 * - 名称 body-sm(14px) fontWeight 500 + numberOfLines=2 截断
 * - 价格 PriceText size="sm"(body-sm=14px)，用 colors.primary（统一价格组件，不硬编码 #A32D2D）
 * - 不复用 HorizontalProductCard（72px 图 + badge + rating + 32px 加购按钮过重，且联想是跳详情非加购；
 *   HorizontalProductCard 还自带 card 边框 + shadow，叠加 SuggestPanel 阴影会双层阴影）
 */
export function SuggestProductItem({ product, onPress, testID }: SuggestProductItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const name = localize(product.name);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('product.viewItem', { name })}
    >
      <View style={[styles.imageWrap, { backgroundColor: colors['surface-container'] }]}>
        <SafeImage source={{ uri: product.image }} style={styles.image} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={2}>
          {name}
        </Text>
        <PriceText value={product.price} size="sm" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 56,
  },
  pressed: { opacity: 0.6 },
  imageWrap: {
    width: 48,
    height: 48,
    borderRadius: 4,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: { width: '100%', height: '100%' },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography['body-sm'],
    fontWeight: '500',
    lineHeight: 18,
  },
});
