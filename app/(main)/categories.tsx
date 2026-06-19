// CategoryPage — 还原自 CategoryPage.html（368 行）
// HTML → RN 行数比：368 → ~470（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 128%）
// Fix-15: Primary tais-pattern Header + 侧栏图标 + Daily Deals + 分类标题 + TaisDivider + HOT PRODUCTS + VIEW ALL + Skeleton
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { useLocalizer } from '@/i18n';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { useCategories } from '@/services/queries/useCatalog';
import { useProductsByCategory } from '@/services/queries/useProducts';
import type { Product } from '@/types';

// 侧栏分类图标（HTML 第 159-182 行：restaurant / checkroom / local_florist / bolt / auto_stories / brush）
interface SidebarCategory {
  id: string;
  label: string;
  icon: string;
  /** 内容区主标题（如 Food → "Food & Kitchen"） */
  contentTitle: string;
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { id: 'food', label: 'Food', icon: 'restaurant', contentTitle: 'Food & Kitchen' },
  { id: 'fashion', label: 'Fashion', icon: 'checkroom', contentTitle: 'Fashion Collection' },
  { id: 'home', label: 'Home', icon: 'local_florist', contentTitle: 'Home Collection' },
  { id: 'tech', label: 'Tech', icon: 'bolt', contentTitle: 'Tech Collection' },
  { id: 'crafts', label: 'Crafts', icon: 'auto_stories', contentTitle: 'Crafts Collection' },
  { id: 'beauty', label: 'Beauty', icon: 'brush', contentTitle: 'Beauty Collection' },
];

// 子分类（圆形图标 + 文字）（HTML 第 244-256 行）
const SUB_CATEGORIES = [
  {
    id: 'fresh-produce',
    label: 'Fresh Produce',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ0mwdZ91JDNcZtgNG8LJuMuPzyGWgEgHF4amLQGyleEaAM2_vN9e8_yls81vcJGObZjolSY46cXtxg98jkaCCa_wYo02uTJ0adxQ4hNa6sKR7DErGKW2_hsOKcpgaRadH6Wdi_ez1vl8UgO8tf3wvaRR6hspIg7UoDHuatdMxH4vg_i4l1eOUgZT0Sbk1rHN0VxWk5owwBS57Fw1a8KARRMaDR1dy4S9OtMZ0Q2wAC3zKlZz1-v-koYDCq3nDIiwQLDYmWArl',
  },
  {
    id: 'local-snacks',
    label: 'Local Snacks',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCn4WB3SlllgqEzE_KkwUjxrwtlMifp6Oxlya4BBGGF2ZQfddW-OMGFSI6mnkOMgplrcsTJNSokWowv0LL19-2nW4vBrHvzirlIzck5i24evPL0U4i-lPJbb0jTKgToz4yV8qwqSpRkKxUvVTOrwRTDJk7bbir9BUqn0drMJgdCCe-zYuLrqSMMOcCRvNXpFKwEpWMn1xU_K9dCRRLd-zI-hTP0BE6MPtmk63q-ROOFzRRkjKF0FzRzNFjAwfRON_Ib39xutCmA',
  },
];

// HOT PRODUCTS mock（HTML 第 264-289 行）
const HOT_PRODUCTS: Product[] = [
  {
    id: 'hot-1',
    name: { zh: 'Ermera 优质咖啡', en: 'Ermera Premium Coffee', tet: 'Kafé Premium Ermera' },
    price: 12.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCyjrHeeobiFoXak9PGkXAhLYNsiqtIdDeqqbao1sLfr8sjL2EhbmGIM-xxxOwwxTok9M2bZK0wnh3cMxKJ7uy1L6DuPMqf2saImFPxCaN0WUPSZf-wg4uHLF14L6fUPy5GQokcdrQra1OaEV7avlq2P1f_ggcW5VwGQU33jvd7WqE6JMgp4WGcOm2-thR50XXQpVxe8YdMngLWc5o1B8d1hhtmzodB54ggassp7ZQchzykOEMi5WQgvNYshq2rYUXGpjSb3u3C',
    category: 'Coffee',
    description: { zh: '', en: '', tet: '' },
  },
  {
    id: 'hot-2',
    name: { zh: '野生森林蜂蜜', en: 'Wild Forest Honey', tet: 'Fuan Foho Metan' },
    price: 8.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCuSltztY2InuCouNxLFTR3dvUPAeuO2NHMnDjtODHFeFj_tFlXPGzC28qveja3V9KkA1PTJ78rhE-VEXDbed8jwb58ymI9L0SxtegdKxZVZeBgOPUQlcmX1vxXeyjq0FehsY3AjQUiQkbvpcY-PIwjZgiOrevERR-jbyGYSUsI5p17iXnA1akgKciu-u40VRfXuKsbrLoCXuMsgzipjKTN07dCJXiMsCBFVewiUnDq8q8JTTWGMw-qbQ6u8jurlbHH-80k_TrD',
    category: 'Honey',
    description: { zh: '', en: '', tet: '' },
  },
];

export default function CategoriesPage() {
  const { colors } = useTheme();
  const localize = useLocalizer();
  const {
    data: categories,
    isLoading: catLoading,
    isError: catError,
    refetch: catRefetch,
  } = useCategories();
  // activeId 默认使用 SIDEBAR_CATEGORIES 第一项，避免初始 useState 拿不到 categories 数据
  const [activeId, setActiveId] = useState<string>(SIDEBAR_CATEGORIES[0].id);
  const {
    data: products,
    isLoading: prodLoading,
    isError: prodError,
    refetch: prodRefetch,
  } = useProductsByCategory(activeId);

  if (catLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <CategoriesHeader />
        <ContentSkeleton />
      </SafeAreaWrapper>
    );
  }
  if (catError || !categories) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <CategoriesHeader />
        <ErrorState message="Failed to load categories" onRetry={() => catRefetch()} />
      </SafeAreaWrapper>
    );
  }

  const activeCategory = SIDEBAR_CATEGORIES.find((c) => c.id === activeId) ?? SIDEBAR_CATEGORIES[0];

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <CategoriesHeader />

      <View style={styles.body}>
        {/* 侧栏 */}
        <View style={[styles.sidebar, { backgroundColor: colors['surface-container-low'] }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {SIDEBAR_CATEGORIES.map((cat) => {
              const active = cat.id === activeId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setActiveId(cat.id)}
                  style={[
                    styles.sidebarItem,
                    active && {
                      backgroundColor: 'rgba(150,24,19,0.1)',
                      borderLeftColor: colors.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={cat.label}
                >
                  <Icon
                    symbol={cat.icon}
                    size={22}
                    color={active ? colors.primary : colors['on-surface-variant']}
                  />
                  <Text
                    style={[
                      styles.sidebarLabel,
                      {
                        color: active ? colors.primary : colors['on-surface-variant'],
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 内容区 */}
        <View style={styles.contentWrap}>
          {prodLoading ? (
            <ContentSkeleton />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
            >
              {/* Daily Deals 横幅（HTML 第 222-238 行） */}
              <Pressable
                onPress={() => router.push('/product/list')}
                style={({ pressed }) => [
                  styles.dealsBanner,
                  {
                    backgroundColor: colors['surface-container-high'],
                    borderColor: 'rgba(141,112,108,0.3)',
                  },
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Daily Deals — Up to 30% off"
              >
                <View style={styles.dealsLeft}>
                  <View style={[styles.dealsIcon, { backgroundColor: 'rgba(150,24,19,0.1)' }]}>
                    <Icon symbol="sell" size={24} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.dealsTitle, { color: colors['on-surface'] }]}>
                      Daily Deals
                    </Text>
                    <Text style={[styles.dealsSub, { color: colors['on-surface-variant'] }]}>
                      Up to 30% off local favorites
                    </Text>
                  </View>
                </View>
                <View style={styles.dealsRight}>
                  <Text style={[styles.dealsView, { color: colors.primary }]}>VIEW</Text>
                  <Icon symbol="chevron_right" size={18} color={colors.primary} />
                </View>
              </Pressable>

              {/* 分类标题 + TaisDivider */}
              <View style={styles.titleWrap}>
                <Text style={[styles.catTitle, { color: colors['on-surface'] }]}>
                  {activeCategory.contentTitle}
                </Text>
                <TaisDivider width={64} />
              </View>

              {/* 子分类圆形图标 */}
              <View style={styles.subGrid}>
                {SUB_CATEGORIES.map((sub) => (
                  <Pressable
                    key={sub.id}
                    onPress={() => router.push('/search')}
                    style={styles.subItem}
                    accessibilityRole="button"
                    accessibilityLabel={sub.label}
                  >
                    <View
                      style={[
                        styles.subIcon,
                        {
                          backgroundColor: colors['surface-container-high'],
                          borderColor: 'rgba(141,112,108,0.1)',
                        },
                      ]}
                    >
                      <Image source={{ uri: sub.image }} style={styles.subImage} />
                    </View>
                    <Text
                      style={[styles.subLabel, { color: colors['on-surface'] }]}
                      numberOfLines={1}
                    >
                      {sub.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* HOT PRODUCTS */}
              <View style={styles.hotHeader}>
                <Text style={[styles.hotTitle, { color: colors['on-surface-variant'] }]}>
                  HOT PRODUCTS
                </Text>
                <View style={[styles.hotLine, { backgroundColor: 'rgba(141,112,108,0.2)' }]} />
              </View>

              {prodError ? (
                <ErrorState message="Failed to load products" onRetry={() => prodRefetch()} />
              ) : !products || products.length === 0 ? (
                <View style={styles.hotGrid}>
                  {HOT_PRODUCTS.map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.hotCard,
                        {
                          backgroundColor: colors['surface-container-lowest'],
                          borderColor: 'rgba(141,112,108,0.1)',
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => router.push(`/product/${p.id}`)}
                        style={styles.hotImageWrap}
                      >
                        <Image source={{ uri: p.image }} style={styles.hotImage} />
                        {p.id === 'hot-1' && (
                          <View style={[styles.hotBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.hotBadgeText}>NEW</Text>
                          </View>
                        )}
                      </Pressable>
                      <Text
                        style={[styles.hotName, { color: colors['on-surface'] }]}
                        numberOfLines={1}
                      >
                        {localize(p.name)}
                      </Text>
                      <View style={styles.hotPriceRow}>
                        <Text style={[styles.hotPrice, { color: colors.primary }]}>
                          ${p.price.toFixed(2)}
                        </Text>
                        <Pressable
                          onPress={() => router.push(`/product/${p.id}`)}
                          style={({ pressed }) => [
                            styles.hotAddBtn,
                            { backgroundColor: colors.primary },
                            pressed && { transform: [{ scale: 0.9 }] },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${localize(p.name)} to cart`}
                        >
                          <Icon symbol="add_shopping_cart" size={18} color="#ffffff" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.hotGrid}>
                  {products.slice(0, 4).map((p) => (
                    <View
                      key={p.id}
                      style={[
                        styles.hotCard,
                        {
                          backgroundColor: colors['surface-container-lowest'],
                          borderColor: 'rgba(141,112,108,0.1)',
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => router.push(`/product/${p.id}`)}
                        style={styles.hotImageWrap}
                      >
                        <Image source={{ uri: p.image }} style={styles.hotImage} />
                      </Pressable>
                      <Text
                        style={[styles.hotName, { color: colors['on-surface'] }]}
                        numberOfLines={1}
                      >
                        {localize(p.name)}
                      </Text>
                      <View style={styles.hotPriceRow}>
                        <Text style={[styles.hotPrice, { color: colors.primary }]}>
                          ${p.price.toFixed(2)}
                        </Text>
                        <Pressable
                          onPress={() => router.push(`/product/${p.id}`)}
                          style={({ pressed }) => [
                            styles.hotAddBtn,
                            { backgroundColor: colors.primary },
                            pressed && { transform: [{ scale: 0.9 }] },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Add ${localize(p.name)} to cart`}
                        >
                          <Icon symbol="add_shopping_cart" size={18} color="#ffffff" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* VIEW ALL PRODUCTS 按钮 */}
              <Pressable
                onPress={() => router.push('/product/list')}
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { borderColor: colors.primary },
                  pressed && { backgroundColor: 'rgba(150,24,19,0.05)' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="View all products"
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  VIEW ALL PRODUCTS
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（HTML 第 141-153 行）
function CategoriesHeader() {
  return (
    <PrimaryHeader
      title=""
      showLocation
      locationLabel="Dili, Christo Rei"
      rightActions={
        <Pressable
          onPress={() => router.push('/search')}
          hitSlop={8}
          style={headerActionStyles.btn}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Icon symbol="search" size={24} color="#ffffff" />
        </Pressable>
      }
    />
  );
}

const headerActionStyles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Skeleton 加载状态（HTML 第 188-218 行）
function ContentSkeleton() {
  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.lg }}>
      {/* Daily Deals skeleton */}
      <Skeleton width="100%" height={72} radius={borderRadius.xl} />
      {/* Title skeleton */}
      <View style={{ marginTop: spacing.xl }}>
        <Skeleton width={160} height={32} />
        <View style={{ marginTop: spacing.xs }}>
          <Skeleton width={64} height={4} />
        </View>
      </View>
      {/* Sub-category circles */}
      <View style={styles.skelSubGrid}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skelSubItem}>
            <Skeleton width={80} height={80} variant="circle" />
            <View style={{ marginTop: spacing.sm }}>
              <Skeleton width={64} height={12} />
            </View>
          </View>
        ))}
      </View>
      {/* Hot products skeleton */}
      <View style={{ marginTop: spacing.xl }}>
        <View style={styles.skelHotGrid}>
          {[0, 1].map((i) => (
            <View key={i} style={styles.skelHotCard}>
              <Skeleton width="100%" height={120} radius={borderRadius.lg} />
              <View style={{ marginTop: spacing.xs }}>
                <Skeleton width="80%" height={14} />
              </View>
              <View style={{ marginTop: spacing.xs }}>
                <Skeleton width={50} height={20} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: '25%',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(141,112,108,0.1)',
  },
  sidebarItem: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  sidebarLabel: {
    ...typography['label-caps'],
    fontSize: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  contentWrap: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  dealsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  dealsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dealsIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealsTitle: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  dealsSub: {
    ...typography['body-sm'],
    fontSize: 10,
  },
  dealsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dealsView: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  titleWrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  catTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  subItem: {
    alignItems: 'center',
    width: 80,
    gap: spacing.sm,
  },
  subIcon: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subImage: {
    width: 56,
    height: 56,
    borderRadius: 999,
    resizeMode: 'contain',
  },
  subLabel: {
    ...typography['label-caps'],
    textAlign: 'center',
  },
  hotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  hotTitle: {
    ...typography['label-caps'],
  },
  hotLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  hotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.md / 2,
  },
  hotCard: {
    width: '50%',
    paddingHorizontal: spacing.md / 2,
    marginBottom: spacing.md,
  },
  hotImageWrap: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#ffe9e6',
  },
  hotImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hotBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hotName: {
    ...typography['body-sm'],
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  hotPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  hotPrice: {
    ...typography['price-display'],
    fontSize: 16,
  },
  hotAddBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  viewAllText: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  // Skeleton styles
  skelSubGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  skelSubItem: {
    alignItems: 'center',
  },
  skelHotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.md / 2,
  },
  skelHotCard: {
    width: '50%',
    paddingHorizontal: spacing.md / 2,
    marginBottom: spacing.md,
    gap: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
