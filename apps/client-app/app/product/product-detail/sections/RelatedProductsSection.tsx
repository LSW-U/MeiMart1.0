// {t('product.pairsWellWith')} 横滑 + {t('product.relatedProducts')} 横滑
// 批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import type { Product, LocalizableText } from '@/types';

type Localize = (text: LocalizableText) => string;

export function RelatedProductsSection({
  pairsWellWith,
  youMayLike,
  localize,
  addRelatedToCart,
}: {
  pairsWellWith: Product[];
  youMayLike: Product[];
  localize: Localize;
  addRelatedToCart: (p: { id: string }) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <>
      {/* {t('product.pairsWellWith')} 横滑 */}
      <View style={styles.section} collapsable={false}>
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
          {t('product.pairsWellWith')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {pairsWellWith.map((p) => (
            <View
              key={p.id}
              style={[
                styles.relatedCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              {/* Why: 外层 View 而非 Pressable，避免 Pressable 嵌套 Pressable
                （RN Web 渲染为 button 套 button，违反 HTML 规范导致 hydration 错误） */}
              <Pressable
                onPress={() => router.push(`/product/${p.id}`)}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                accessibilityRole="button"
                accessibilityLabel={t('product.viewItem', { name: localize(p.name) })}
              >
                <View style={[styles.relatedImage, { backgroundColor: colors['surface-variant'] }]}>
                  <SafeImage source={{ uri: p.image }} style={styles.relatedImg} />
                </View>
                <View style={styles.relatedInfo}>
                  <Text
                    style={[styles.relatedName, { color: colors['on-surface'] }]}
                    numberOfLines={1}
                  >
                    {localize(p.name)}
                  </Text>
                  <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                    ${p.price.toFixed(2)}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.relatedAddWrap}>
                <Pressable
                  onPress={() => addRelatedToCart(p)}
                  style={({ pressed }) => [
                    styles.relatedAddBtn,
                    { borderColor: colors.primary },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('product.addToCartLabel', { name: localize(p.name) })}
                >
                  <Text style={[styles.relatedAddText, { color: colors.primary }]}>
                    {t('product.addToCart')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* {t('product.relatedProducts')} 横滑 */}
      <View
        style={[
          styles.section,
          {
            borderTopColor: colors['outline-variant'],
            borderTopWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('product.relatedProducts')}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {youMayLike.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/product/${p.id}`)}
              style={({ pressed }) => [
                styles.relatedCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('product.viewItem', { name: localize(p.name) })}
            >
              <View style={[styles.relatedImage, { backgroundColor: colors['surface-variant'] }]}>
                <SafeImage source={{ uri: p.image }} style={styles.relatedImg} />
              </View>
              <View style={styles.relatedInfo}>
                <Text
                  style={[styles.relatedName, { color: colors['on-surface'] }]}
                  numberOfLines={1}
                >
                  {localize(p.name)}
                </Text>
                <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                  ${p.price.toFixed(2)}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  hScroll: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  relatedCard: {
    width: 140,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  relatedImage: {
    height: 140,
  },
  relatedImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  relatedInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  relatedAddWrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  relatedName: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  relatedPrice: {
    ...typography['price-display'],
    fontSize: 16,
  },
  relatedAddBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  relatedAddText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
});
