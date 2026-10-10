// 本页通过 BannerCarousel / CategoryGrid / PromoDock / MasonryProductCard / SmallProductCard 复用
// 还原自 HomePage.html（511 行）。HTML → RN 行数比：511 → ~480（含样式），
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 94%）。
// P6: 间距微调 + 分类网格 C2/角标/溢出 + PromoShortcut→PromoDock（方案二色条）
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, spacing, layout, typography, shadowPresets, gradientPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { BannerCarousel } from '@/components/business/BannerCarousel';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { PromoDock } from '@/components/business/PromoDock';
import { SmallProductCard } from '@/components/business/SmallProductCard/SmallProductCard';
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Banner, Product } from '@/types';
import type { Promotion } from '@/services/promotion';
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
import { useUnreadCount } from '@/services/queries/useNotifications';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/store/toastStore';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { safeRoutePush } from '@meimart/nav-core';

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
  // Why: §9-4 瀑布流两列分发改 FlatList numColumns（C-P2-10，分发逻辑由列表承担）
  const { data: buyAgainProducts } = useBuyAgain();
  // A-P2-2：useMemo 稳定引用（renderDashboardHeader 依赖数组要求引用稳定，空数组兜底不变）
  const buyAgainList = useMemo(() => buyAgainProducts ?? [], [buyAgainProducts]);
  // Why: P6 V3e - PromoDock 数据源由 usePromotions hook 驱动（后端控制数量/排序/时效）
  const { data: promotions } = usePromotions();
  const addToCartMutation = useAddToCart();
  // 批B B3：mail 图标角标换真实未读数（原硬编码 2 是线上假数据，方案v2 风险#8）
  // 未登录时 useUnreadCount 不请求（enabled: isAuthenticated）→ data undefined → 不显示角标
  const { data: unreadCount } = useUnreadCount();

  // Why: Buy again 加购
  // C-P2-10: useCallback 稳定化——memo 化的 MasonryProductCard/SmallProductCard props 浅比较，
  //   回调不稳定会让 memo 失效（每渲染全列表重渲）
  const handleBuyAgainAddToCart = useCallback(
    (item: Product) => {
      addToCartMutation.mutate(
        { product: item, quantity: 1 },
        {
          onSuccess: () =>
            toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
          onError: () =>
            toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
        },
      );
    },
    [addToCartMutation, t],
  );

  // Why: 批3 P2-2 —— 卡片签名 (product)=>void，直传稳定 handler（消灭内联箭头）
  const handleCardPress = useCallback((p: Product) => router.push(`/product/${p.id}`), []);

  // Why: 批3 A7 —— CategoryGrid 透传给 memo 化 CategoryItem 的回调稳定引用
  const handleCategoryPress = useCallback(
    (c: { id: string }) =>
      router.push({ pathname: '/(main)/categories', params: { categoryId: c.id } }),
    [],
  );
  const handleMorePress = useCallback(() => router.push('/(main)/categories'), []);

  // A-P2-1: banner/promo link 是后端可控数据（banner.linkValue 为 admin 可输入的
  //   linkType URL/PRODUCT/CATEGORY/NONE），不直接 push——完整匹配的动态段路由
  //   （/product/{id}）走 safeRoutePush 白名单（对齐 PushDeepLinkDelegate 先例）；
  //   其余一律不导航（不裸 push 回退，防止任意路径注入）。
  const handleBannerPress = useCallback((b: Banner) => {
    if (!b.link) return;
    const productMatch = /^\/product\/([A-Za-z0-9-]+)$/.exec(b.link);
    if (productMatch) {
      safeRoutePush((href) => router.push(href as never), '/product', productMatch[1]);
    }
    // 非 /product/{id} 形态（含 CATEGORY/URL/NONE 或异常值）→ 不导航（空降页面无承接）
  }, []);

  const handlePromoPress = useCallback((p: Promotion) => {
    // Promotion.link 由后端 home.entries.ts 静态白名单下发，但仍按下发数据对待：
    // 仅放行已知静态路径前缀，非匹配不导航
    if (/^\/(product\/list|coupons|profile)(\?.*)?$/.test(p.link)) {
      router.push(p.link as never);
    }
  }, []);

  // A-P2-2: 瀑布流 renderItem（FlatList numColumns=2；列表主体见下方 A-P2-2 说明）
  const renderMasonryItem = useCallback(
    ({ item }: { item: Product }) => (
      <View style={styles.masonryCell}>
        <MasonryProductCard
          product={item}
          badge={resolveBadges(item, t)[0]}
          onPress={handleCardPress}
          onAddToCart={handleBuyAgainAddToCart}
        />
      </View>
    ),
    [t, handleBuyAgainAddToCart, handleCardPress],
  );
  // C-P2-10/A-P2-2: 推荐瀑布流改 FlatList(numColumns=2) 且**直接承担页面滚动**（A-P2-2：
  //   旧版 FlatList(scrollEnabled=false) 嵌 ScrollView，虚拟化失效全量挂载）——页面其余
  //   dashboard 区块（搜索栏/Banner/分类/Divider/PromoDock/推荐标题/横滑区）收进
  //   ListHeaderComponent；Buy Again 横滑留 header 尾部（横滑区非列表语义，留原样）。
  //   行为零变更：odd/even 分列顺序一致（numColumns 按索引取模分列，等价原
  //   i%2===0→col1 / i%2===1→col2）；高度档位错落在 MasonryProductCard 内部（按 id 档位），
  //   FlatList 网格行内等高但列间仍错落（卡片图高不同 + info 自适应），视觉语义保持。
  //   loading/error/空列表三态时退回 ScrollView 包 dashboard 区（区块少非热路径）。
  const renderDashboardHeader = useCallback(
    () => (
      <>
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
            <BannerCarousel banners={banners} onBannerPress={handleBannerPress} />
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
              // Why: 批3 A7 —— CategoryItem 为 React.memo，经 CategoryGrid 透传的回调须稳定引用
              onCategoryPress={handleCategoryPress}
              // Why: P6 V1f - 超 7 分类时第 8 格 More 跳全量分类页
              onMorePress={handleMorePress}
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
          <PromoDock promotions={promotions ?? []} onPress={handlePromoPress} />
        </View>

        {/* 推荐商品标题 + 状态行（瀑布流列表主体在 FlatList data；横滑见 Buy Again） */}
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
            <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('common.seeAll')}</Text>
            <Icon symbol="chevron_right" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Buy Again — 横滑小卡片（HTML 第 389-421 行；横滑区非列表语义，留原样） */}
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
                onPress={handleCardPress}
                onAddToCart={handleBuyAgainAddToCart}
              />
            ))}
          </ScrollView>
        </View>
      </>
    ),
    [
      buyAgainList,
      banners,
      categories,
      colors,
      handleBuyAgainAddToCart,
      handleBannerPress,
      handleCardPress,
      handleCategoryPress,
      handleMorePress,
      handlePromoPress,
      promotions,
      shouldSkipNonEssential,
      t,
    ],
  );

  // A-P2-2: dashboard 三态（loading/error/空列表）退回 ScrollView——瀑布流无数据时
  //   FlatList 仅剩 header（等价原 ScrollView 布局）；有数据才走 FlatList 主体
  const dashboardFallback = useCallback(
    () => (
      <ScrollView
        style={[styles.scrollArea, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderDashboardHeader()}
        {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
        {isError && <ErrorState message={t('errors.products')} onRetry={() => refetch()} />}
      </ScrollView>
    ),
    [colors, isLoading, isError, refetch, renderDashboardHeader, t],
  );

  return (
    <PageErrorBoundary pageName="home">
      {/* Why: edges 仅 top —— header 红底需避状态栏。bottom 不需 edges：
        列表的 scrollContent.paddingBottom(xxl*2=96px) 兜底浮动 BottomNav + 底部手势条
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
              {(unreadCount ?? 0) > 0 && (
                // 批B B3：真实未读数（原硬编码 2 已删）。
                // P2-1 修复（方案a）：底色传语义 error 红（light #C62828 / dark #EF9A9A 深红），
                // Badge label 恒用 colors['on-primary']（light 白 / dark 深红）→ 两主题均红字白底可读；
                // 原传 ON_PRIMARY 白底在 light 下白字白底不可见（审查 P2-1）
                <Badge
                  count={unreadCount ?? 0}
                  variant="number"
                  color={colors.semantic.error}
                  accessibilityLabel={t('home.unreadBadge', { count: unreadCount ?? 0 })}
                  style={styles.msgBadgePosition}
                />
              )}
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

        {isLoading || isError || recommendList.length === 0 ? (
          dashboardFallback()
        ) : (
          // A-P2-2: 单列表容器——FlatList 直接承担页面滚动（虚拟化生效），
          //   dashboard 区块挂 ListHeaderComponent（Buy Again 横滑留 header 尾部）
          <FlatList
            style={[styles.scrollArea, { backgroundColor: colors.background }]}
            data={recommendList}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.masonryRow}
            contentContainerStyle={styles.scrollContent}
            renderItem={renderMasonryItem}
            ListHeaderComponent={renderDashboardHeader}
            onScrollToIndexFailed={() => undefined}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

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
  // 批B B3：Badge absolute 定位（原 msgBadge/msgBadgeText 内联样式删，Badge 自带底色圆角）
  msgBadgePosition: {
    position: 'absolute',
    top: -2,
    right: -2,
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
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)，HTML 24px 应映射 lg）
    marginTop: spacing.lg,
  },
  section: {
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)）
    marginTop: spacing.lg,
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
    // V15：区块节奏 24px 对齐原型（原误映射 xl(32)）
    marginTop: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
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
  // Why: §9-4 瀑布流两列容器（替 recommendCard 横滑）
  masonryRow: {
    // FlatList numColumns=2 行容器（C-P2-10）：承接原两列布局的横向 padding + 列间距
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
  },
  masonryCell: {
    // 每列等宽（numColumns 均分，flex:1 + gap 已由行容器控制）
    flex: 1,
  },
  buyAgainSection: {
    // Why: P6 S5 - Buy Again marginTop xl(32) -> lg(24)，页尾区块视觉收束
    marginTop: spacing.lg,
  },
  buyAgainHeader: {
    paddingHorizontal: layout['container-margin'],
    marginBottom: spacing.md,
  },
  // Why: 可点击主体（图片+名称+价格）
  // Why: 加购按钮行，靠右对齐
});
