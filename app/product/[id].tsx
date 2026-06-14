import { StyleSheet, View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useProduct } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';

const MOCK_REVIEWS = [
  {
    id: 'r1',
    userId: 'u1',
    userName: '张**',
    rating: 5,
    content: '商品很新鲜，物流很快，下次还会买',
    createdAt: '2026-06-10',
  },
  {
    id: 'r2',
    userId: 'u2',
    userName: '李**',
    rating: 4,
    content: '质量不错，包装也很好',
    createdAt: '2026-06-08',
  },
];

export default function ProductDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const addToCartMutation = useAddToCart();

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title="商品详情" showBack onBackPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={{ color: colors['on-surface-variant'] }}>加载中…</Text>
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError || !product) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title="商品详情" showBack onBackPress={() => router.back()} />
        <ErrorState message="商品不存在或加载失败" onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const addToCart = () => {
    addToCartMutation.mutate(
      { product, quantity: 1 },
      {
        onSuccess: () => Alert.alert('已加入购物车', product.name),
      },
    );
  };

  const buyNow = () => {
    addToCart();
    router.push('/order/checkout');
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="商品详情" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        <View style={styles.info}>
          <PriceText value={product.price} originalPrice={product.originalPrice} size="lg" />
          <Text style={[styles.name, { color: colors['on-surface'] }]}>{product.name}</Text>
          {product.salesCount !== undefined && (
            <Text style={[styles.meta, { color: colors['on-surface-variant'] }]}>
              销量 {product.salesCount} · 评分 {product.rating ?? '-'}
            </Text>
          )}
        </View>
        <TaisDivider />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>商品介绍</Text>
          <Text style={[styles.desc, { color: colors['on-surface-variant'] }]}>
            {product.description ?? '暂无描述'}
          </Text>
        </View>
        <TaisDivider />
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>用户评价</Text>
          <Card>
            {MOCK_REVIEWS.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewName, { color: colors['on-surface'] }]}>
                    {r.userName}
                  </Text>
                  <Text style={[styles.reviewRating, { color: colors.primary }]}>
                    {'★'.repeat(r.rating)}
                  </Text>
                </View>
                <Text style={[styles.reviewBody, { color: colors['on-surface-variant'] }]}>
                  {r.content}
                </Text>
                <Text style={[styles.reviewDate, { color: colors['on-surface-variant'] }]}>
                  {r.createdAt}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.outline, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.push('/service')}
          accessibilityRole="button"
          accessibilityLabel="联系客服"
        >
          <Text style={[styles.actionText, { color: colors['on-surface'] }]}>客服</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: colors.outline, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.push('/(main)/cart')}
          accessibilityRole="button"
          accessibilityLabel="购物车"
        >
          <Text style={[styles.actionText, { color: colors['on-surface'] }]}>购物车</Text>
        </Pressable>
        <Button
          label="加入购物车"
          variant="outline"
          onPress={addToCart}
          loading={addToCartMutation.isPending}
        />
        <Button label="立即购买" variant="primary" onPress={buyNow} />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  image: { width: '100%', height: 360 },
  info: { padding: spacing.lg, gap: spacing.sm },
  name: { ...typography.h2, fontWeight: '700' },
  meta: { ...typography['body-sm'] },
  section: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { ...typography.h3, fontWeight: '700' },
  desc: { ...typography['body-md'], lineHeight: 22 },
  reviewRow: { paddingVertical: spacing.sm, gap: spacing.xs },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewName: { ...typography['body-sm'], fontWeight: '600' },
  reviewRating: { ...typography['body-sm'] },
  reviewBody: { ...typography['body-sm'], lineHeight: 20 },
  reviewDate: { ...typography['label-caps'] },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { ...typography['body-sm'], fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
