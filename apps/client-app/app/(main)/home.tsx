// 本页通过 BannerCarousel / CategoryGrid / PromoShortcut / ProductCard / BuyAgainCard 复用
// 还原自 HomePage.html（511 行）。HTML → RN 行数比：511 → ~480（含样式），
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 94%）。
// Fix-9: 推荐改横滑卡片 + Buy Again 横滑 + ProductCard 角标 + Header TaisPattern 叠加
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
import { useLocalizer } from '@/i18n';
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
import { PromoShortcut } from '@/components/business/PromoShortcut';
import { ProductCard } from '@/components/business/ProductCard';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';
import type { Product } from '@/types';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Logo } from '@/components/cultural/Logo';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import { useRecommendations, useBuyAgain } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';

const SHORTCUTS = [
  {
    id: 'deals',
    labelKey: 'shortcut.dealsLabel',
    titleKey: 'shortcut.deals',
    icon: 'local_offer',
    bgColor: 'rgba(150,24,19,0.05)',
    borderColor: 'rgba(150,24,19,0.2)',
    labelColor: '#961813',
    titleColor: '#961813',
    iconColor: '#961813',
    withCorner: true,
    link: '/product/list?promotion=flash',
  },
  {
    id: 'new',
    labelKey: 'shortcut.newLabel',
    titleKey: 'shortcut.newUser',
    icon: 'person_add',
    bgColor: '#ecfdf5',
    borderColor: '#d1fae5',
    labelColor: '#047857',
    titleColor: '#047857',
    iconColor: '#059669',
    link: '/coupons',
  },
  {
    id: 'coupons',
    labelKey: 'shortcut.couponsLabel',
    titleKey: 'profile.coupons',
    icon: 'confirmation_number',
    bgColor: 'rgba(99,71,0,0.1)',
    borderColor: 'rgba(99,71,0,0.2)',
    labelColor: '#634700',
    titleColor: '#000000',
    iconColor: '#634700',
    link: '/coupons',
  },
  {
    id: 'delivery',
    labelKey: 'shortcut.deliveryLabel',
    titleKey: 'shortcut.freeDelivery',
    icon: 'moped',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    labelColor: '#1d4ed8',
    titleColor: '#1d4ed8',
    iconColor: '#2563eb',
    link: '/product/list',
  },
];

// Buy Again 区块改用 useBuyAgain 从 mockDb 拉 p007-p010，避免与详情页数据脱节

// 推荐商品角标轮转：第 1 张 Fresh / 第 2 张 Best Seller / 后续无角标
function getRecommendBadge(index: number, t: (key: string) => string): ProductBadge | undefined {
  if (index === 0) return { label: t('product.badgeFresh'), variant: 'fresh' };
  if (index === 1) return { label: t('product.badgeBestSeller'), variant: 'best-seller' };
  return undefined;
}

export default function HomePage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: products, isLoading, isError, refetch } = useRecommendations();
  const recommendList = products ?? [];
  const { data: buyAgainProducts } = useBuyAgain();
  const buyAgainList = buyAgainProducts ?? [];
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
            <Icon symbol="location_on" size={13} color="#ffffff" />
            <Text style={styles.locationText} numberOfLines={1}>
              {t('home.locationLabel')}
            </Text>
            <Icon symbol="expand_more" size={13} color="#ffffff" />
          </Pressable>
          <Pressable
            testID="home-messages"
            onPress={() => router.push('/service/notifications')}
            style={styles.msgBtn}
            accessibilityRole="button"
            accessibilityLabel={t('home.messagesLabel')}
          >
            <Icon symbol="mail" size={24} color="#ffffff" />
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
        <Icon symbol="local_shipping" size={18} color="#000000" />
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
              categories={categories.slice(0, 8)}
              onCategoryPress={(c) =>
                router.push({ pathname: '/(main)/categories', params: { categoryId: c.id } })
              }
            />
          </View>
        )}

        {/* Tais Divider（保留 HTML 装饰） */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
          <TaisDivider />
          <View style={[styles.dividerLine, { backgroundColor: colors['outline-variant'] }]} />
        </View>

        {/* Promo Shortcuts */}
        <View style={styles.section}>
          <PromoShortcut
            items={SHORTCUTS.map((s) => ({ ...s, label: t(s.labelKey), title: t(s.titleKey) }))}
            onPress={(item) => router.push('/search')}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={180 + spacing.md}
              snapToAlignment="start"
              contentContainerStyle={styles.hScroll}
            >
              {recommendList.map((item, index) => (
                <View key={item.id} style={styles.recommendCard}>
                  <ProductCard
                    product={item}
                    badge={getRecommendBadge(index, t)}
                    onPress={() => router.push(`/product/${item.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
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
              <View
                key={item.id}
                style={[
                  styles.buyAgainCard,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                ]}
              >
                {/* Why: 图片+名称+价格可点击跳转详情；加购按钮独立，避免 Pressable 嵌套 */}
                <Pressable
                  onPress={() => router.push(`/product/${item.id}`)}
                  style={({ pressed }) => [styles.buyAgainMain, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${localize(item.name)}`}
                >
                  <View
                    style={[
                      styles.buyAgainImageWrap,
                      { backgroundColor: colors['surface-container'] },
                    ]}
                  >
                    <SafeImage source={{ uri: item.image }} style={styles.buyAgainImage} />
                  </View>
                  <Text
                    style={[styles.buyAgainName, { color: colors['on-surface-variant'] }]}
                    numberOfLines={1}
                  >
                    {localize(item.name)}
                  </Text>
                  <Text style={[styles.buyAgainPrice, { color: colors.primary }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                </Pressable>
                <View style={styles.buyAgainRow}>
                  <Pressable
                    onPress={() => handleBuyAgainAddToCart(item)}
                    hitSlop={8}
                    style={styles.buyAgainAddBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('product.addToCartLabel', { name: localize(item.name) })}
                  >
                    <Icon symbol="add_shopping_cart" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
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
    color: '#ffffff',
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
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    color: '#000000',
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
    marginTop: spacing.md,
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
    paddingVertical: spacing.md,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  recommendSection: {
    marginTop: spacing.xl,
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
  buyAgainSection: {
    marginTop: spacing.xl,
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
