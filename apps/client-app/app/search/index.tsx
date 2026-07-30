// SearchPage — 还原自 SearchPage.html（337 行）
// HTML → RN 行数比：337 → ~390（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-10: 重建 5 个缺失模块（Primary Header / Filter Tags / Recent / Popular / Recommended）
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
import { ProductCard } from '@/components/business/ProductCard';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { useProducts } from '@/services/queries/useProducts';
import { useCategories } from '@/services/queries/useCatalog';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useTranslation } from 'react-i18next';

// Why: 红底白字固定（header primary 底 + Filter Tag active 底 + 热搜榜 rank 1/2），dark 不变
//   同 home.tsx ON_PRIMARY 模式（P6 审查 Q1），不用 colors['on-primary']（dark 翻 #690005 裂色）
const ON_PRIMARY = '#ffffff';
// Why: 金底黑字固定（热搜榜 rank 3 amber 底），dark 不变（同 home.tsx ON_AMBER 模式）
const ON_AMBER = '#000000';

// Why: P7 决策 3-B - 热搜榜（rank = 数组顺序 1-4，heat 写死，后端就绪切真实热度数据）
const POPULAR_SEARCHES = [
  { id: 'organic-rice', titleKey: 'search.term.organicRice', heat: '120k' },
  { id: 'fresh-meat', titleKey: 'search.term.freshMeat', heat: '98k' },
  { id: 'ermera-coffee', titleKey: 'search.term.ermeraCoffee', heat: '76k' },
  { id: 'cooking-oil', titleKey: 'search.term.cookingOil', heat: '54k' },
];

// Why: RECENT_SEARCHES 删 - Commit 3 接 useRecentSearches hook（AsyncStorage 持久化）
// Why: FILTER_TAGS 删 - 改 useCategories() 动态分类（P7 I7）

// Why: 推荐商品改用 useProducts 真实数据（避免 mock id 'rec-*' 跳转详情 404）

// 推荐商品角标轮转：FRESH / BEST SELLER / 无 / FRESH
function getRecommendBadge(idx: number): ProductBadge | undefined {
  if (idx === 0) return { label: 'FRESH', variant: 'fresh' };
  if (idx === 1) return { label: 'BEST SELLER', variant: 'best-seller' };
  if (idx === 3) return { label: 'FRESH', variant: 'fresh' };
  return undefined;
}

// Uma Lulik curve 锯齿底边（HTML clip-path polygon，22 个点 zigzag）
function UmaLulikCurve({ color }: { color: string }) {
  const width = 390;
  const height = 176;
  const points = [
    '0,0',
    `${width},0`,
    `${width},149`,
    '370.5,154',
    '351,149',
    '331.5,154',
    '312,149',
    '292.5,154',
    '273,149',
    '253.5,154',
    '234,149',
    '214.5,154',
    '195,149',
    '175.5,154',
    '156,149',
    '136.5,154',
    '117,149',
    '97.5,154',
    '78,149',
    '58.5,154',
    '39,149',
    '19.5,154',
    '0,149',
  ].join(' ');
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

export default function SearchIndexPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  // Why: P7 I7 - Filter Tags 改 useCategories() 动态分类，首项 "All"（t('common.all')）
  const { data: categories } = useCategories();
  const filterTags = [t('common.all'), ...(categories?.map((c) => c.name) ?? [])];
  const [activeTag, setActiveTag] = useState(t('common.all'));
  // Why: P7 F1 - Recent Searches AsyncStorage 持久化（useRecentSearches hook，最多 10 条去重最新在前）
  const { recentSearches, addRecent, removeRecent, clearRecent } = useRecentSearches();
  // Why: 用真实商品替换 mock rec-* id，避免 router.push('/product/rec-1') 跳转后 404
  const { data: realProducts } = useProducts();
  const recommended = (realProducts ?? []).slice(0, 4);
  // Why: P7 决策 3-B - 热搜榜排名配色（1 红 / 2 中红 / 3 金 / 4+ 灰，对齐 HTML 原型 .hot-num.n1-n5）
  const rankColors = [
    { bg: colors.primary, fg: ON_PRIMARY },
    { bg: colors['primary-container'], fg: ON_PRIMARY },
    { bg: colors.cultural.amber, fg: ON_AMBER },
    { bg: colors['secondary-container'], fg: colors['on-secondary-container'] },
  ];
  const getRankColor = (rank: number) => rankColors[Math.min(rank - 1, rankColors.length - 1)];

  const onSubmitSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    // Why: P7 F1 - 搜索提交时记录到 Recent（AsyncStorage 持久化）
    addRecent(trimmed);
    router.push({ pathname: '/search/results', params: { q: trimmed } });
  };

  return (
    <SafeAreaWrapper edges={['top']} style={{ backgroundColor: colors.primary, flex: 1 }}>
      <StatusBarConfig />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary Header — 176px + uma-lulik-curve 锯齿底边 */}
        <View style={styles.headerWrap}>
          {/* 底色块（被锯齿底边裁掉下半部分形成 zigzag） */}
          <View style={[styles.headerBg, { backgroundColor: colors.primary }]}>
            <View style={styles.headerPattern} pointerEvents="none">
              <TaisPattern width={390} height={176} opacity={0.1} />
            </View>
          </View>
          {/* 锯齿底边覆盖（让 header 下方背景透出锯齿形状） */}
          <View style={styles.curveLayer} pointerEvents="none">
            <UmaLulikCurve color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <View style={styles.toolbar}>
              <View style={styles.toolbarLeft}>
                <Pressable
                  onPress={handleBack}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
                </Pressable>
                <Text style={styles.toolbarTitle} accessibilityRole="header">
                  {t('common.search')}
                </Text>
              </View>
              <View style={styles.toolbarRight}>
                <Pressable
                  onPress={() => router.push('/service')}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Customer service"
                >
                  <Icon symbol="support_agent" size={24} color={ON_PRIMARY} />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/cart')}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Shopping cart"
                >
                  <Icon symbol="shopping_cart" size={24} color={ON_PRIMARY} />
                </Pressable>
              </View>
            </View>
            {/* Search Bar（嵌入 primary header 内） */}
            <View style={styles.searchBarWrap}>
              <SearchBar
                value={query}
                onChange={setQuery}
                autoFocus
                variant="card"
                showMic
                placeholder={t('home.searchPlaceholder')}
                onSubmit={onSubmitSearch}
              />
            </View>
          </View>
        </View>

        {/* Filter Tags 横滑 */}
        <View style={styles.filterTagsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterTagsRow}>
              {filterTags.map((tag) => {
                const active = tag === activeTag;
                return (
                  <Pressable
                    key={tag}
                    onPress={() => setActiveTag(tag)}
                    style={[
                      styles.filterTag,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : {
                            // Why: C1 胶囊化 - surface-container-high 底 + transparent 描边（无 rgba）
                            backgroundColor: colors['surface-container-high'],
                            borderColor: 'transparent',
                          },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter: ${tag}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.filterTagText, { color: active ? ON_PRIMARY : colors.primary }]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recent Searches（P7 F1: AsyncStorage 持久化 + 流式 chip，空时隐藏整块） */}
        {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('search.recent')}
            </Text>
            <Pressable
              onPress={clearRecent}
              accessibilityRole="button"
              accessibilityLabel={t('search.clearAll')}
            >
              <Text style={[styles.clearAllText, { color: colors.primary }]}>{t('search.clearAll')}</Text>
            </Pressable>
          </View>
          <View style={styles.recentChips}>
            {recentSearches.map((item) => (
              <Pressable
                key={item}
                onPress={() => onSubmitSearch(item)}
                style={({ pressed }) => [styles.recentChip, pressed && styles.chipPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item}`}
              >
                <Text
                  style={[styles.recentChipText, { color: colors['on-surface-variant'] }]}
                  numberOfLines={1}
                >
                  {item}
                </Text>
                <Pressable
                  onPress={() => removeRecent(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item}`}
                >
                  {/* 原因：on-sv 暖灰 close 图标，dark 不变（方案 §2.3 F1 流式 chip） */}
                  <Icon symbol="close" size={12} color={colors['on-surface-variant']} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
        )}

        {/* Popular Searches 热搜榜（P7 决策 3-B：排名序号 + 热搜词 + 热度标签） */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('search.popular')}
          </Text>
          <View style={styles.hotList}>
            {POPULAR_SEARCHES.map((item, idx) => {
              const rank = idx + 1;
              const label = t(item.titleKey);
              const rankColor = getRankColor(rank);
              return (
              <Pressable
                key={item.id}
                onPress={() => onSubmitSearch(label)}
                style={({ pressed }) => [
                  styles.hotRank,
                  { backgroundColor: colors['surface-container-low'] },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${label}`}
              >
                <View style={[styles.hotNum, { backgroundColor: rankColor.bg }]}>
                  <Text style={[styles.hotNumText, { color: rankColor.fg }]}>{rank}</Text>
                </View>
                <Text
                  style={[styles.hotWord, { color: colors['on-surface'] }]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <View style={[styles.hotTag, { backgroundColor: colors['surface-container-high'] }]}>
                  <Icon symbol="trending_up" size={10} color={colors.primary} />
                  <Text style={[styles.hotTagText, { color: colors.primary }]}>{item.heat}</Text>
                </View>
              </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recommended for You 商品网格 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('search.recommended')}
          </Text>
          <View style={styles.recommendGrid}>
            {recommended.map((product, idx) => (
              <View key={product.id} style={styles.recommendCell}>
                <ProductCard
                  product={product}
                  badge={getRecommendBadge(idx)}
                  showFavorite
                  onPress={() => router.push(`/product/${product.id}`)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  headerWrap: {
    position: 'relative',
    height: 176,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 176,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  curveLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    position: 'relative',
    flex: 1,
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitle: {
    ...typography.h2,
    color: ON_PRIMARY,
    fontWeight: '700',
  },
  searchBarWrap: {
    marginTop: spacing.md,
  },
  filterTagsWrap: {
    paddingTop: spacing.lg,
  },
  filterTagsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: layout['container-margin'],
  },
  filterTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterTagText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  section: {
    paddingHorizontal: layout['container-margin'],
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
    fontWeight: '600',
  },
  clearAllText: {
    ...typography['label-caps'],
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // Why: P7 F1 - Recent 流式 chip（flex-wrap 自动换行，无背景无边框，纯文字 on-sv + close 12px）
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  // Why: 流式 chip 按压 scale(.92) 触觉反馈（对齐原型 .recent-chip:active）
  chipPressed: { transform: [{ scale: 0.92 }] },
  recentChipText: {
    ...typography['body-sm'],
    fontWeight: '500',
    fontSize: 13,
  },
  // Why: P7 决策 3-B - 热搜榜样式（每行 rank + word + heat tag，对齐 HTML 原型 .hot-rank/.hot-num/.hot-tag）
  hotList: {
    gap: spacing.sm,
  },
  hotRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  hotNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hotWord: {
    ...typography['body-sm'],
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  hotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotTagText: {
    fontSize: 9,
    fontWeight: '600',
  },
  recommendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  recommendCell: {
    width: '48%',
    flexGrow: 1,
  },
});
