// 本页通过 BannerCarousel / CategoryGrid / PromoDock / MasonryProductCard / SmallProductCard 复用
// 还原自 HomePage.html（511 行）。HTML → RN 行数比：511 → ~480（含样式），
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 94%）。
// P6: 间距微调 + 分类网格 C2/角标/溢出 + PromoShortcut→PromoDock（方案二色条）
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useTheme,
  spacing,
  layout,
  typography,
  shadowPresets,
  gradientPresets,
  borderRadius,
} from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { BannerCarousel } from '@/components/business/BannerCarousel';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { PromoDock } from '@/components/business/PromoDock';
import { SmallProductCard } from '@/components/business/SmallProductCard/SmallProductCard';
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Product } from '@/types';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Logo } from '@/components/cultural/Logo';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import { useRecommendations, useBuyAgain } from '@/services/queries/useProducts';
import { usePromotions } from '@/services/queries/usePromotions';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

// Why: 红底白字固定（header primary 渐变底 + 红色 badge 底），dark 不变
//   同 MasonryProductCard/SmallProductCard/HorizontalProductCard 的 ON_PRIMARY 模式
//   不用 colors['on-primary']（dark 翻 #690005 裂色）—— 审查 Q1
const ON_PRIMARY = '#ffffff';
// Why: 黄底黑字固定（delivery tip amber 底），dark 不变 —— 审查 Q1
const ON_AMBER = '#000000';

// Buy Again 区块改用 useBuyAgain 从 mockDb 拉 p007-p010，避免与详情页数据脱节

export default function HomePage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: products, isLoading, isError, refetch } = useRecommendations();
  const recommendList = products ?? [];
  // Why: §9-4 瀑布流两列分发（奇偶分列）；§9-5 badge 改 resolveBadges 派生（不按位置）
  const masonryCol1 = recommendList.filter((_, i) => i % 2 === 0);
  const masonryCol2 = recommendList.filter((_, i) => i % 2 === 1);
  const { data: buyAgainProducts } = useBuyAgain();
  const buyAgainList = buyAgainProducts ?? [];
  // Why: P6 V3e - PromoDock 数据源由 usePromotions hook 驱动（后端控制数量/排序/时效）
  const { data: promotions } = usePromotions();
  const addToCartMutation = useAddToCart();

  // Why: Buy again 加购
  const handleBuyAgainAddToCart = (item: Product) => {
    addToCartMutation.mutate(
      { product: item, quantity: 1 },
      {
        onSuccess: () => toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
        onError: () => toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
      },
    );
  };
  return (
    <PageErrorBoundary pageName="home">
    {/* Why: edges 仅 top —— header 红底需避状态栏。bottom 不需 edges：
        ScrollView 的 scrollContent.paddingBottom(xxl*2=96px) 兜底浮动 BottomNav + 底部手势条
        （主 tab 是自定义 BottomNav 浮层非系统 TabBar，故 home 走 paddingBottom 而非 edges bottom，审查 Q3）*/}
    <SafeAreaWrapper edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
      <LinearGradient
        {...gradientPresets.brand}
        colors={[colors.primary, colors['primary-container']]}
        style={styles.headerBg}
      >
        <StatusBarConfig />
        {/* Fix-9: header tais-pattern 叠加（HTML 第 128 行 opacity-20） */}
        <View style={styles.headerPatternOverlay} pointerEvents="none">
          <TaisPattern width={400} height={200} opacity={0.2} />
        </View>
        {/* Sticky Header — Logo + 定位 + 消息红点 */}
        <View style={styles.headerRow}>
          <View style={styles.brandCol}>
            <Logo size={32} />
            <Text style={styles.brandName} accessibilityRole="header">
              {t('home.appName')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/address/map')}
            style={styles.locationChip}
            accessibilityRole="button"
            accessibilityLabel={t('home.locationLabel')}
          >
            <Icon symbol="location_on" size={13} color={ON_PRIMARY} />
            <Text style={styles.locationText} numberOfLines={1}>
              {t('home.locationLabel')}
            </Text>
            <Icon symbol="expand_more" size={13} color={ON_PRIMARY} />
          </Pressable>
          <Pressable
            testID="home-messages"
            onPress={() => router.push('/service/notifications')}
            style={styles.msgBtn}
            accessibilityRole="button"
            accessibilityLabel={t('home.messagesLabel')}
          >
            <Icon symbol="mail" size={24} color={ON_PRIMARY} />
            <View style={[styles.msgBadge, { borderColor: colors.primary }]}>
              <Text style={[styles.msgBadgeText, { color: colors.primary }]}>2</Text>
            </View>
          </Pressable>
        </View>
        {/* Uma Lulik Skyline 过渡（header → body） */}
        <View style={styles.skylineRow}>
          <UmaLulikSkyline height={24} />
        </View>
      </LinearGradient>

      {/* Delivery Tip — 黄色横条 */}
      <View style={[styles.deliveryTip, { backgroundColor: colors.cultural.amber }]}>
        <Icon symbol="local_shipping" size={18} color={ON_AMBER} />
        <Text style={styles.deliveryTipText}>{t('home.deliveryTip')}</Text>
      </View>

      <ScrollView
        style={[styles.scrollArea, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 搜索栏 */}
        <View style={styles.searchSection}>
          <Pressable
            onPress={() => router.push('/search')}
            style={({ pressed }) => [
              styles.searchCard,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
              shadowPresets.sm,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="search"
          >
            <Icon symbol="search" size={22} color={colors.outline} />
            <Text style={[styles.searchPlaceholder, { color: colors['on-surface-variant'] }]}>
              {t('home.searchPlaceholder')}
            </Text>
          </Pressable>
        </View>

        {/* Banner 轮播（弱网降级：跳过） */}
        {!shouldSkipNonEssential && banners && banners.length > 0 && (
          <View style={styles.bannerSection}>
            <BannerCarousel
              banners={banners}
              onBannerPress={(b) => b.link && router.push(b.link)}
            />
          </View>
        )}

        {/* 分类入口 */}
        {categories && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('home.categories')}
              </Text>
              <Pressable
                onPress={() => router.push('/(main)/categories')}
                style={styles.seeAllBtn}
                accessibilityRole="button"
                accessibilityLabel={t('home.seeAllCategories')}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>
                  {t('common.seeAll')}
                </Text>
                <Icon symbol="chevron_right" size={16} color={colors.primary} />
              </Pressable>
            </View>
            <CategoryGrid
              categories={categories}
              onCategoryPress={(c) =>
                router.push({ pathname: '/(main)/categories', params: { categoryId: c.id } })
              }
              // Why: P6 V1f - 超 7 分类时第 8 格 More 跳全量分类页
              onMorePress={() => router.push('/(main)/categories')}
            />
          </View>
        )}

        {/* Tais Divider（保留 HTML 装饰） */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
          <TaisDivider />
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* PromoDock - 横排功能停靠栏（V3c 无标题，接 TaisDivider 下方） */}
        <View style={styles.section}>
          <PromoDock
            promotions={promotions ?? []}
            onPress={(p) => router.push(p.link)}
          />
        </View>

        {/* 推荐商品标题 + 横滑卡片 */}
        <View style={styles.recommendSection}>
          <View style={[styles.sectionHeader, styles.recommendHeader]}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('home.recommend')}
            </Text>
            <Pressable
              onPress={() => router.push('/product/list')}
              style={styles.seeAllBtn}
              accessibilityRole="button"
              accessibilityLabel={t('home.seeAllProducts')}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                {t('common.seeAll')}
              </Text>
              <Icon symbol="chevron_right" size={16} color={colors.primary} />
            </Pressable>
          </View>
          {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
          {isError && <ErrorState message={t('errors.products')} onRetry={() => refetch()} />}
          {!isLoading && !isError && recommendList.length > 0 && (
            // Why: §9-4 - 横滑 ProductCard -> 两列瀑布流 MasonryProductCard（手动分发，方案 §9.4-B）
            //      ⚠️ 无 HTML 原型（推荐横滑改瀑布流是方案改版），高度档位错落
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>
                {masonryCol1.map((item) => (
                  <MasonryProductCard
                    key={item.id}
                    product={item}
                    badge={resolveBadges(item, t)[0]}
                    onPress={() => router.push(`/product/${item.id}`)}
                    onAddToCart={() => handleBuyAgainAddToCart(item)}
                  />
                ))}
              </View>
              <View style={styles.masonryCol}>
                {masonryCol2.map((item) => (
                  <MasonryProductCard
                    key={item.id}
                    product={item}
                    badge={resolveBadges(item, t)[0]}
                    onPress={() => router.push(`/product/${item.id}`)}
                    onAddToCart={() => handleBuyAgainAddToCart(item)}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Buy Again — 横滑小卡片（HTML 第 389-421 行） */}
        <View style={styles.buyAgainSection}>
          <View style={[styles.sectionHeader, styles.buyAgainHeader]}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('order.actions.repurchase')}
            </Text>
            <Icon symbol="history" size={20} color={colors.outline} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {buyAgainList.map((item) => (
              // Why: P1 - 替换内联 buyAgainCard 为统一 SmallProductCard（方案 §4）
              <SmallProductCard
                key={item.id}
                product={item}
                onPress={() => router.push(`/product/${item.id}`)}
                onAddToCart={() => handleBuyAgainAddToCart(item)}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const RECOMMEND_CARD_WIDTH = 180;

const styles = StyleSheet.create({
  headerBg: {
    paddingBottom: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingBottom: spacing.xxl * 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    gap: spacing.md,
    zIndex: 1,
  },
  brandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    ...typography.h2,
    color: ON_PRIMARY,
    fontWeight: '700',
  },
  // Why: 位置胶囊 - 和 PrimaryHeader 统一样式，半透明白底圆角
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 150,
  },
  locationText: {
    ...typography['body-sm'],
    color: ON_PRIMARY,
    fontSize: 12,
    flexShrink: 1,
  },
  msgBtn: {
    position: 'relative',
    padding: spacing.xs,
  },
  msgBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: ON_PRIMARY,
    borderRadius: 999,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  msgBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  skylineRow: {
    marginTop: -1,
    zIndex: 1,
  },
  deliveryTip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deliveryTipText: {
    ...typography['label-caps'],
    color: ON_AMBER,
    fontSize: 10,
  },
  searchSection: {
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.md,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchPlaceholder: {
    ...typography['body-sm'],
  },
  bannerSection: {
    // Why: P6 S2 - searchSection → banner 拉到统一 xl(32) 节奏
    marginTop: spacing.xl,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: layout['container-margin'],
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  seeAllText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout['container-margin'],
    // Why: P6 S3 - TaisDivider 上下 padding md(16) -> lg(24)，视觉呼吸更充分
    paddingVertical: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  recommendSection: {
    // Why: P6 S4 - PromoDock → 推荐区 xl(32) + sm(8)，避免 dock 与推荐区贴太近
    marginTop: spacing.xl + spacing.sm,
  },
  recommendHeader: {
    paddingHorizontal: layout['container-margin'],
    marginBottom: spacing.md,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  hScroll: {
    paddingHorizontal: layout['container-margin'],
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  recommendCard: {
    width: RECOMMEND_CARD_WIDTH,
  },
  // Why: §9-4 瀑布流两列容器（替 recommendCard 横滑）
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
  },
  masonryCol: {
    flex: 1,
    gap: spacing.md,
  },
  buyAgainSection: {
    // Why: P6 S5 - Buy Again marginTop xl(32) -> lg(24)，页尾区块视觉收束
    marginTop: spacing.lg,
  },
  buyAgainHeader: {
    paddingHorizontal: layout['container-margin'],
    marginBottom: spacing.md,
  },
  buyAgainCard: {
    minWidth: 140,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  // Why: 可点击主体（图片+名称+价格）
  buyAgainMain: {
    gap: spacing.xs,
  },
  buyAgainImageWrap: {
    height: 96,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  buyAgainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  buyAgainName: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  // Why: 加购按钮行，靠右对齐
  buyAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  buyAgainAddBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyAgainPrice: {
    ...typography['price-display'],
    fontSize: 14,
  },
});
