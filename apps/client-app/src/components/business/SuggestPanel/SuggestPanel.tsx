import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useTheme, spacing, typography, shadowPresets, borderRadius } from '@/theme';
import { useTranslation } from 'react-i18next';
import { SuggestWordItem } from './SuggestWordItem';
import { SuggestProductItem } from './SuggestProductItem';
import type { SuggestPanelProps } from './SuggestPanel.types';

/**
 * 搜索联想面板（C方案 §4.4，淘宝模式「词 + 商品混合」）
 *
 * 定位：由父页 search/index.tsx 用 absolute 挂在 headerWrap 外、ScrollView 同级（top:90 zIndex:10）。
 *   ⚠️ 不能挂进 headerWrap（headerWrap overflow:hidden 会裁掉面板，方案 §4.4 锚点说明）。
 *
 * 滚动：ScrollView + View 列。方案 §4.4 建议 FlatList「避免 ScrollView 嵌套」，但 SuggestPanel 在
 *   absolute 同级（不在外层 ScrollView 内），ScrollView 不嵌套冲突；且 ScrollView + View 列更清晰
 *   渲染 section 标题（词区标题 / 商品区标题 / 空态），故选 ScrollView。
 *
 * 状态机（方案 §4.5）：isLoading && 全空 → 加载态 / 有词或有商品 → 分区渲染 / 全空 → CTA + 热搜补位。
 *   失败态（isError）由父页判断不渲染本组件（§4.5「离线/失败 → 面板隐藏」）。
 */
export function SuggestPanel({
  words,
  products,
  query,
  isLoading,
  hotFallback,
  onWordPress,
  onProductPress,
  onHotFallbackPress,
  testID,
}: SuggestPanelProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const hasWords = words.length > 0;
  const hasProducts = products.length > 0;
  const allEmpty = !hasWords && !hasProducts;

  // 方案 §4.5 - 加载中且无旧数据 → 加载态（keepPreviousData 由父组件保留，此时 words/products 非空走分区渲染）
  if (isLoading && allEmpty) {
    return (
      <View
        style={[styles.panel, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.lg]}
        testID={testID}
        accessibilityRole="search"
      >
        <View style={styles.loadingWrap}>
          <Text style={[styles.loadingText, { color: colors['on-surface-variant'] }]}>
            {t('common.loading', { defaultValue: 'Loading...' })}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.panel, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.lg]}
      testID={testID}
      accessibilityRole="search"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {hasWords && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
              {t('search.suggested')}
            </Text>
            {words.map((w, i) => (
              <SuggestWordItem
                key={`${w.word}-${i}`}
                word={w.word}
                searchCount={w.searchCount}
                onPress={() => onWordPress(w.word)}
                testID={`suggest-word-${i}`}
              />
            ))}
          </View>
        )}
        {hasWords && hasProducts && (
          <View style={[styles.divider, { backgroundColor: colors['outline-variant'] }]} />
        )}
        {hasProducts && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
              {t('search.suggestedProducts')}
            </Text>
            {products.map((p, i) => (
              <SuggestProductItem
                key={p.id}
                product={p}
                onPress={() => onProductPress(p)}
                testID={`suggest-product-${i}`}
              />
            ))}
          </View>
        )}
        {allEmpty && (
          // Why: 方案 §7.4 - 全空显示面板 + CTA + 热搜补位 chips（不隐藏，超市用户搜索意图强）
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors['on-surface-variant'] }]}>
              {t('search.noSuggestion', { q: query })}
            </Text>
            {hotFallback && hotFallback.length > 0 && (
              <View style={styles.hotChips}>
                {hotFallback.slice(0, 3).map((h) => (
                  <Pressable
                    key={h.word}
                    onPress={() => onHotFallbackPress?.(h.word)}
                    style={({ pressed }) => [
                      styles.hotChip,
                      { backgroundColor: colors['surface-container-high'] },
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Search ${h.word}`}
                  >
                    <Text style={[styles.hotChipText, { color: colors.primary }]} numberOfLines={1}>
                      {h.word}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: borderRadius.lg,
    maxHeight: 360,
    overflow: 'hidden',
  },
  scroll: { maxHeight: 360 },
  scrollContent: { paddingVertical: spacing.sm },
  section: { gap: 2 },
  sectionTitle: {
    ...typography['label-caps'],
    fontSize: 11,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  loadingWrap: { padding: spacing.lg, alignItems: 'center' },
  loadingText: { ...typography['body-sm'] },
  emptyWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg, gap: spacing.md },
  emptyText: { ...typography['body-sm'], textAlign: 'center' },
  hotChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  hotChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  hotChipText: { ...typography['body-sm'], fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
