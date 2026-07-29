import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, borderRadius, typography, shadowPresets } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PriceText } from '@/components/ui/PriceText';
import { Icon } from '@/components/ui/Icon';
import type { SmallProductCardProps } from './SmallProductCard.types';

// Why: 全局卡片统一方案 §4 - 横滑小卡统一组件
//   140 宽 + 96 高图 + 12px 名（on-surface）+ PriceText 双价格 + 32² 圆形加购按钮
//   替代 home buyAgainCard（裸图标 add_shopping_cart）+ cart recommendCard（圆形 add）的分裂
// 原因：红底加购按钮上的固定白字，dark 不变（同 P2/P3 ON_PRIMARY 模式，不用 colors['on-primary']）
const ON_PRIMARY = '#ffffff';

export function SmallProductCard({ product, onPress, onAddToCart, testID }: SmallProductCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const name = localize(product.name);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        shadowPresets.sm,
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={t('product.viewItem', { name })}
      >
        <View style={[styles.imageWrap, { backgroundColor: colors['surface-container'] }]}>
          <SafeImage source={{ uri: product.image }} style={styles.image} />
        </View>
        <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={1}>
          {name}
        </Text>
        <PriceText value={product.price} originalPrice={product.originalPrice} size="sm" />
      </Pressable>
      <View style={styles.bottom}>
        {/* Why: 统一加购按钮 - 32² 圆形 999 primary + 白 add（废弃 add_shopping_cart，方案 §2.2） */}
        <Pressable
          onPress={onAddToCart}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('product.addToCartLabel', { name })}
        >
          <Icon symbol="add" size={18} color={ON_PRIMARY} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  main: { gap: spacing.xs },
  imageWrap: {
    height: 96,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  // Why: 方案 §2.2 - 商品名最小 12px / on-surface（从 label-caps 10px / variant 提升）
  name: { ...typography['label-caps'], fontSize: 12, fontWeight: '600' },
  bottom: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.xs },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
