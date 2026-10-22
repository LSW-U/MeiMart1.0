// FrequentlyBoughtPage — 常购清单（客户画像批3 B1，方案v2 §三 批3 2026-10-18）
//
// 数据：GET /client/products/buy-again（复用 useBuyAgain，无翻页 offset=0 首批 20 条——
//   清单页定位是「我的常买商品」全览而非横滑推荐，后端上限 20 内一次拉全）。
// 排序口径：后端聚合频次 desc + last_at desc（R-a 同源），前端不重排（P3-1 一致性红线）。
// 交互：HorizontalProductCard 纵向列（§9-3 与 product/list 统一）+ 一键重购加购（每卡单独加购，
//   沿用 handleAdd 错误映射三态：SOLD_OUT / STOCK_EXCEEDED / getApiErrorMessage）。
import { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { useBuyAgain } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import { resolveBadges } from '@/utils/resolveBadges';
import { router } from 'expo-router';
import type { Product } from '@/types';

// 红底白字固定（header primary 底），dark 不变（同 product/list ON_PRIMARY 模式）
const ON_PRIMARY = '#ffffff';
// 清单页一次拉全：buy-again 后端上限 20，取满即「全览」
const BUY_AGAIN_PAGE_LIMIT = 20;

export default function FrequentlyBoughtPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 批3 P2-2 修复：匿名分流——未登录不请求（后端兜底返回销量切片而非「你常买的」，
  //   渲染出来是文案与内容错位），直接渲染 guest 空态引导登录；已登录返回空才显示无记录态
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useBuyAgain({
    limit: BUY_AGAIN_PAGE_LIMIT,
    enabled: isAuthenticated,
  });
  const addMutation = useAddToCart();

  // Why: 与 product/list handleAdd 同款三态错误映射（第四轮批4 P3 一致口径）
  const handleAdd = useCallback(
    (product: Product) => {
      addMutation.mutate(
        { product, quantity: 1 },
        {
          onSuccess: () => {
            toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' }));
          },
          onError: (err) => {
            const msg = err instanceof Error ? err.message : '';
            const friendly =
              msg === 'SOLD_OUT'
                ? t('product.soldOut', { defaultValue: 'Sold Out' })
                : msg === 'STOCK_EXCEEDED'
                  ? t('product.stockExceeded')
                  : getApiErrorMessage(
                      err,
                      t('product.addToCartFailed', { defaultValue: 'Failed to add to cart' }),
                    );
            toast.error(friendly);
          },
        },
      );
    },
    [addMutation, t],
  );

  const handleCardPress = useCallback((p: Product) => router.push(`/product/${p.id}`), []);

  const headerTitle = t('home.frequentlyBought');

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <LoadingOverlay visible />
      </SafeAreaWrapper>
    );
  }

  if (isError) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <ErrorState
          message={t('errors.products', { defaultValue: 'Failed to load products' })}
          onRetry={() => refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  // 批3 P2-2 修复：匿名分流——未登录（不请求，data undefined）直接渲染 guest 空态引导登录；
  //   已登录且返回空才显示「还没有购买记录」态
  if (!isAuthenticated || !products || products.length === 0) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <EmptyState
          title={t('home.frequentlyBoughtEmpty')}
          description={
            isAuthenticated
              ? t('home.frequentlyBoughtEmptyDesc')
              : t('home.frequentlyBoughtEmptyDescGuest')
          }
          icon="history"
          actionLabel={t('home.frequentlyBoughtBrowse')}
          onAction={() => router.push('/product/list')}
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={headerTitle} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 排序口径提示（P3-1：频次+最近下单，后端排序前端不重排） */}
        <Text style={[styles.orderHint, { color: colors['on-surface-variant'] }]}>
          {t('home.frequentlyBoughtOrderHint')}
        </Text>
        <View style={styles.listColumn}>
          {products.map((product) => (
            <HorizontalProductCard
              key={product.id}
              product={product}
              badge={resolveBadges(product, t)[0]}
              onPress={handleCardPress}
              onAddToCart={handleAdd}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（product/list 同款）
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={56} opacity={0.1} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Why: 右侧 40px 占位平衡左返回键，保证标题严格居中（product/list 同款）
  headerRightPlaceholder: {
    width: 40,
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
    color: ON_PRIMARY,
    fontWeight: '600',
  },
  orderHint: {
    ...typography['label-caps'],
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  listColumn: {
    gap: spacing.md,
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
});
