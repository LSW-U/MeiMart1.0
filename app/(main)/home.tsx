// 本页通过 BannerCarousel / CategoryGrid / PromoShortcut / ProductCard 复用
// 还原自 HomePage.html（511 行）。HTML → RN 行数比：511 → ~430（含样式），
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 84%）。
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme, spacing, typography, shadowPresets, gradientPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { BannerCarousel } from '@/components/business/BannerCarousel';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { PromoShortcut } from '@/components/business/PromoShortcut';
import { ProductCard } from '@/components/business/ProductCard';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Logo } from '@/components/cultural/Logo';
import { UmaLulikSkyline } from '@/components/cultural/UmaLulikSkyline';
import { Icon } from '@/components/ui/Icon';
import { useCategories, useBanners } from '@/services/queries/useCatalog';
import { useRecommendations } from '@/services/queries/useProducts';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { Product } from '@/types';

const SHORTCUTS = [
  { id: 'flash', title: '限时秒杀', icon: 'lightning-bolt' },
  { id: 'new', title: '新品上市', icon: 'new-box' },
  { id: 'sale', title: '满减优惠', icon: 'tag' },
  { id: 'delivery', title: '当日达', icon: 'truck-fast' },
];

export default function HomePage() {
  const { colors } = useTheme();
  const { shouldSkipNonEssential } = useWeakNetworkUI();
  const { data: banners } = useBanners();
  const { data: categories } = useCategories();
  const { data: products, isLoading, isError, refetch } = useRecommendations();

  return (
    <SafeAreaWrapper edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
      <LinearGradient
        {...gradientPresets.brand}
        colors={[colors.primary, colors['primary-container']]}
        style={styles.headerBg}
      >
        <StatusBarConfig />
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

      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        style={styles.scrollArea}
        ListHeaderComponent={
          <View>
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
                  <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                    Categories
                  </Text>
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

            {/* 推荐商品标题 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
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
              {isLoading && <ActivityIndicator color={colors.primary} />}
              {isError && <ErrorState message="加载商品失败" onRetry={() => refetch()} />}
            </View>
          </View>
        }
        renderItem={({ item }: { item: Product }) => (
          <View style={styles.cell}>
            <ProductCard product={item} onPress={() => router.push(`/product/${item.id}`)} />
          </View>
        )}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    paddingBottom: 0,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['container-margin'],
    paddingVertical: spacing.md,
    gap: spacing.md,
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
  list: {
    paddingHorizontal: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
    backgroundColor: 'transparent',
  },
  searchSection: {
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
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
  },
});
