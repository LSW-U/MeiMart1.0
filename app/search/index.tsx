// SearchPage — 还原自 SearchPage.html（337 行）
// HTML → RN 行数比：337 → ~390（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-10: 重建 5 个缺失模块（Primary Header / Filter Tags / Recent / Popular / Recommended）
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { SearchBar } from '@/components/business/SearchBar';
import { ProductCard } from '@/components/business/ProductCard';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import type { Product } from '@/types';

// Filter Tags（HTML 第 158-163 行）
const FILTER_TAGS = ['All Categories', 'Fresh', 'Pantry', 'Drinks', 'Fruit', 'Rice'];

// Recent Searches（HTML 第 171-186 行）
const RECENT_SEARCHES = ['Fos Lais', 'Sabaun fase roupa'];

// Popular Searches（HTML 第 188-217 行）
const POPULAR_SEARCHES = [
  { id: 'organic-rice', label: 'Organic Rice' },
  { id: 'fresh-meat', label: 'Fresh Meat' },
  { id: 'ermera-coffee', label: 'Ermera Coffee' },
  { id: 'cooking-oil', label: 'Cooking Oil' },
];

// 推荐商品 mock（HTML 第 222-272 行的 4 张卡片）
const RECOMMENDED: Product[] = [
  {
    id: 'rec-1',
    name: 'Organic Rice 5kg',
    price: 12.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCknzBB-OmbcSPhlbjB806DoUJ0WkWxaVAoCwDg8pmxtP0Lif3DQET2BMCS9qphYk5ag-3K8Je-teCqRifr-KcE_Snuq1huoIbxoCX3gJNq9mj8VRL9cSLfNVzB_-AQWohO1UpBp0n5XTguQFAkAGaKDkFhhwqy9JMTzc7RjjqvZFauM1e94AinBnRKhaS_pksfK7TGMilO2dRtm0ysCT95K4dpykuI10Q0oQAglZeTM9wt-8N08h-7VpEb1ZVVmwdGzkb_V7ok',
    category: 'Local Agriculture',
    description: '',
  },
  {
    id: 'rec-2',
    name: 'Arabica Coffee 250g',
    price: 8.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCWeJP4XWPW0OOcAqIRu9iKpsNYVGPidRP98g4ZGq0-sspNtxokZY4RhfyclV44MOavAzu2nTBnBow9xvFz3nup3GRUNzuW1SqjB4J4d2DHITO9UWzA-4yKFQxJxoOPfaOIoSTAo9fz4ta5dcwfASRrDOf3Wp3GH9HVIU7hax2lkYYz0cCfuBa9UYciw5p7m_Ljwa5YFoVIEk8DracFoN9JEtI7MLRfTwQtSfT9sK5dDTPW4q1SNIS8pPbkqfkADPVBW3zQLHr3',
    category: 'Ermera Specialty',
    description: '',
  },
  {
    id: 'rec-3',
    name: 'Beef 1kg',
    price: 15.2,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDxb8eoZ2Un2_q3XtJq_EwFP0JPN5-nEBPLyKUqgJx3lOyEpxDol1NVS1cjhdeBSfB03rJakIosOhtZscua-6bgRqUveSb0h4QeeCDC_N9Pafbu_KeS45wVh6o0UDvyKuP9OQg4yXrJULkA_5kztsnYTW9_oCGuAvBxirrOdb_ceyu7MAMQvliA9HD2GCg_VpnRdz8dwvk6dcwXduMz97H64Gfw9PgkDjz5OlzvpPidDDKWsPceVU-k8mVwxV3LxtId1oDNswzn',
    category: 'Meat Market',
    description: '',
  },
  {
    id: 'rec-4',
    name: 'Tropical Mixed Fruit',
    price: 4.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAVbJaVvDDcit_qOfEVIMYGqB5O5HVL5MSL0QTTuw9H2Z5iDyiJ9HTA-l5E4XixKLyXmKDgqQOFsPdo54jJE6MQdy2x8_QFT528tnbo-2iTQ5ECTZsdaM6kZmXvjwjuvRmtk2KCTvNg1uiUqLr-QPj0km2ydUcqwdU0cn5JBFruN6EcpRW6f2OXNhUBiroWxAhjQ_MgY_-L6f55VxZiw4lve3IVnT-dHnv7alOKhNVsfxI1tlP9Y0XHplvhCrREreZyMWtid6aK',
    category: 'Farm Direct',
    description: '',
  },
];

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
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All Categories');

  const onSubmitSearch = (q: string) => {
    if (!q.trim()) return;
    router.push({ pathname: '/search/results', params: { q } });
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
                  onPress={() => router.back()}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Icon symbol="arrow_back" size={24} color="#ffffff" />
                </Pressable>
                <Text style={styles.toolbarTitle} accessibilityRole="header">
                  Search
                </Text>
              </View>
              <View style={styles.toolbarRight}>
                <Pressable
                  onPress={() => router.push('/service/customer')}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Customer service"
                >
                  <Icon symbol="support_agent" size={24} color="#ffffff" />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/cart')}
                  hitSlop={8}
                  style={styles.toolbarBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Shopping cart"
                >
                  <Icon symbol="shopping_cart" size={24} color="#ffffff" />
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
                placeholder="Search household essentials..."
                onSubmit={onSubmitSearch}
              />
            </View>
          </View>
        </View>

        {/* Filter Tags 横滑 */}
        <View style={styles.filterTagsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterTagsRow}>
              {FILTER_TAGS.map((tag) => {
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
                            backgroundColor: colors['surface-container-high'],
                            borderColor: 'rgba(225, 191, 186, 0.4)',
                          },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter: ${tag}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.filterTagText, { color: active ? '#ffffff' : colors.primary }]}
                    >
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recent Searches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              Recent Searches
            </Text>
            <Pressable
              onPress={() => {}}
              accessibilityRole="button"
              accessibilityLabel="Clear all recent searches"
            >
              <Text style={[styles.clearAllText, { color: colors.primary }]}>CLEAR ALL</Text>
            </Pressable>
          </View>
          <View style={styles.recentList}>
            {RECENT_SEARCHES.map((item) => (
              <View
                key={item}
                style={[styles.recentRow, { borderBottomColor: 'rgba(141, 112, 108, 0.1)' }]}
              >
                <View style={styles.recentLeft}>
                  <Icon symbol="history" size={20} color="rgba(97, 99, 99, 0.4)" />
                  <Pressable
                    onPress={() => onSubmitSearch(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${item}`}
                  >
                    <Text style={[styles.recentText, { color: colors['on-surface'] }]}>{item}</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => {}}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item}`}
                >
                  <Icon symbol="close" size={14} color="rgba(97, 99, 99, 0.4)" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Popular Searches 2×2 网格 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            Popular Searches
          </Text>
          <View style={styles.popularGrid}>
            {POPULAR_SEARCHES.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => onSubmitSearch(item.label)}
                style={({ pressed }) => [
                  styles.popularCard,
                  {
                    backgroundColor: colors['surface-container-lowest'],
                    borderColor: 'rgba(225, 191, 186, 0.4)',
                  },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Search ${item.label}`}
              >
                <View
                  style={[styles.popularIconWrap, { backgroundColor: colors['surface-container'] }]}
                >
                  <Icon symbol="trending_up" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.popularLabel, { color: colors['on-surface'] }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recommended for You 商品网格 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            Recommended for You
          </Text>
          <View style={styles.recommendGrid}>
            {RECOMMENDED.map((product, idx) => (
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
    paddingHorizontal: spacing['container-margin'],
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
    color: '#ffffff',
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
    paddingHorizontal: spacing['container-margin'],
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
    paddingHorizontal: spacing['container-margin'],
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
  recentList: {
    gap: spacing.sm,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recentText: {
    ...typography['body-md'],
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  popularCard: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  popularIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularLabel: {
    ...typography['body-sm'],
    fontWeight: '500',
    flexShrink: 1,
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
