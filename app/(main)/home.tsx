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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  useTheme,
  spacing,
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
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Logo } from '@/components/cultural/Logo';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import { useRecommendations } from '@/services/queries/useProducts';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';

const SHORTCUTS = [
  {
    id: 'deals',
    label: 'SAVE BIG',
    title: 'Deals',
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
    label: 'WELCOME',
    title: 'New User',
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
    label: 'REDEEM',
    title: 'Coupons',
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
    label: 'LIMITED',
    title: 'Free Delivery',
    icon: 'moped',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    labelColor: '#1d4ed8',
    titleColor: '#1d4ed8',
    iconColor: '#2563eb',
    link: '/product/list',
  },
];

// Buy Again mock（HTML 第 389-421 行：Bee Botir / Asukar 小卡片）
const BUY_AGAIN: { id: string; name: string; price: number; image: string }[] = [
  {
    id: 'buy-1',
    name: 'Bee Botir 600ml',
    price: 0.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCE3sTv-XZhtRhkl92P2N_5rhCCODDi4Xps8vSc5b2WRUe11tpJKJHGsGCdTwOySKJ6sKq6LmnuxAHrj2vwCrBtdgr9_akZcFV-N0FUFEn2Tt8zqIEIzta9uDm-xRPhhQUCcbZSdOV7n7sfYVF3II4r9FKwsXEMF0cd0nvTA8J0oVyo0EjoqVatlIK_xCLblnx95w1K5kqdwoxhKJmvlVZ1XnMA6DgTPRoDNOGKNrG0QoqRFVrej3MwLxWgSGljQvxxXECepyJO',
  },
  {
    id: 'buy-2',
    name: 'Asukar 1kg',
    price: 1.2,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAgORJZUTBW_lQWUP0A-PqyDlrkXeZFsZKSTd11VLZrrpFOxtwkyZO1AfMgwChLp0xeOjbqsXy1U3EHfGAozayccsp0fVv0FUM5nngs2I7LmapkoyqIHpjiWU7u9r-dx1aO-6snlxBRxl1LN29i202-FnWRRXWoyDUf-tSXKlvtlWvmoOti26OXZ3eVg806wPfB1R0oEV9w_Cs3GuseFuvwu1ewO8zckynXd1F0pa7bVzGycgLCPB8TKZ9WPrxTEJCAeG9fZ4ZM',
  },
  {
    id: 'buy-3',
    name: 'Foos Lafaek 5kg',
    price: 4.8,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBXs-CQLr3ottuFHa8A8jV5U8wot6MLv7kddnkUZL7B_NigcoSIRd1bc0r32kBq2SNUzS5SVcna2oK31NPahWdDm8rATsDVi5n2Zlq-LbgXQh_IqjlESZXtk_4VpPW3u_9BbTW4KERum0HVRbYzjb-csWo9tDgiXG1JwcflhuaDQGtcsCw5Y4V1OYmP5y1N_wSttHNPb_hOC4IhFdBUIZ5B7TaiedXTLNI26vu379e5PAWkq6diJlV3zzSmrF-O8JELi-xN4n0B',
  },
  {
    id: 'buy-4',
    name: 'Huun Klean 4pk',
    price: 1.8,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA-1b7aBs9aO47BTPz5sy-Z-vUZD_ttiKwLqQ3V13Ly16NpxaZuahzP5VttDlGDnLyisdIS3AFgLDx5LNFskYTNTKoOcPhqQn3N607wZE7tyfn7Q3SJJSF9UmhrmmHy9fxNYi_Wp3CPsY45XIIrXfwaBO9u4rxPhHz2HtZhPWSg2wzZyZ2lNS-0HnFUg2IGOJiKw7EvTnkbQi21d3nQyziBh2a_4TPHcAw05wbi694fAea8At5KfqcHYYXUuVP4KPMeOHCYa9oJ',
  },
];

// 推荐商品角标轮转：第 1 张 Fresh / 第 2 张 Best Seller / 后续无角标
function getRecommendBadge(index: number): ProductBadge | undefined {
  if (index === 0) return { label: 'Fresh', variant: 'fresh' };
  if (index === 1) return { label: 'Best Seller', variant: 'best-seller' };
  return undefined;
}

export default function HomePage() {
  const { colors } = useTheme();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: products, isLoading, isError, refetch } = useRecommendations();
  const recommendList = products ?? [];

  return (
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
              Mei mart
            </Text>
          </View>
          <BlurView
            intensity={20}
            tint="light"
            style={[styles.locationChip, styles.locationChipBorder]}
          >
            <Icon symbol="location_on" size={16} color="#ffffff" />
            <Text style={styles.locationText}>Dili, Christo Rei</Text>
          </BlurView>
          <Pressable
            testID="home-messages"
            onPress={() => router.push('/service/notifications')}
            style={styles.msgBtn}
            accessibilityRole="button"
            accessibilityLabel="Messages"
          >
            <Icon symbol="mail" size={24} color="#ffffff" />
            <View style={styles.msgBadge}>
              <Text style={styles.msgBadgeText}>2</Text>
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
        <Text style={styles.deliveryTipText}>Delivery active · Today 1-2h · Free over $20</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
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
              Search household essentials...
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
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>Categories</Text>
              <Pressable
                onPress={() => router.push('/(main)/categories')}
                style={styles.seeAllBtn}
                accessibilityRole="button"
                accessibilityLabel="See all categories"
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>SEE ALL</Text>
                <Icon symbol="chevron_right" size={16} color={colors.primary} />
              </Pressable>
            </View>
            <CategoryGrid
              categories={categories.slice(0, 8)}
              onCategoryPress={(c) =>
                router.push({ pathname: '/product/list', params: { category: c.id } })
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
          <PromoShortcut items={SHORTCUTS} onPress={(item) => router.push('/search')} />
        </View>

        {/* 推荐商品标题 + 横滑卡片 */}
        <View style={styles.recommendSection}>
          <View style={[styles.sectionHeader, styles.recommendHeader]}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              Recommended for You
            </Text>
            <Pressable
              onPress={() => router.push('/product/list')}
              style={styles.seeAllBtn}
              accessibilityRole="button"
              accessibilityLabel="See all products"
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>SEE ALL</Text>
              <Icon symbol="chevron_right" size={16} color={colors.primary} />
            </Pressable>
          </View>
          {isLoading && <ActivityIndicator color={colors.primary} style={styles.loader} />}
          {isError && <ErrorState message="加载商品失败" onRetry={() => refetch()} />}
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
                    badge={getRecommendBadge(index)}
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
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>Buy Again</Text>
            <Icon symbol="history" size={20} color={colors.outline} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {BUY_AGAIN.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push('/product/list')}
                style={({ pressed }) => [
                  styles.buyAgainCard,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: colors['outline-variant'],
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Reorder ${item.name}`}
              >
                <View
                  style={[
                    styles.buyAgainImageWrap,
                    { backgroundColor: colors['surface-container'] },
                  ]}
                >
                  <Image source={{ uri: item.image }} style={styles.buyAgainImage} />
                </View>
                <Text
                  style={[styles.buyAgainName, { color: colors['on-surface-variant'] }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View style={styles.buyAgainRow}>
                  <Text style={[styles.buyAgainPrice, { color: colors.primary }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                  <Icon symbol="add_shopping_cart" size={16} color={colors.primary} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
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
    paddingHorizontal: spacing['container-margin'],
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
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    gap: spacing.xs,
  },
  locationChipBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  locationText: {
    ...typography['label-caps'],
    color: '#ffffff',
    fontSize: 10,
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
    borderColor: '#961813',
  },
  msgBadgeText: {
    color: '#961813',
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
    paddingHorizontal: spacing['container-margin'],
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
    paddingHorizontal: spacing['container-margin'],
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing['container-margin'],
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
    paddingHorizontal: spacing['container-margin'],
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
    paddingHorizontal: spacing['container-margin'],
    marginBottom: spacing.md,
  },
  loader: {
    paddingVertical: spacing.lg,
  },
  hScroll: {
    paddingHorizontal: spacing['container-margin'],
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
    paddingHorizontal: spacing['container-margin'],
    marginBottom: spacing.md,
  },
  buyAgainCard: {
    minWidth: 140,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
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
  buyAgainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  buyAgainPrice: {
    ...typography['price-display'],
    fontSize: 14,
  },
});
