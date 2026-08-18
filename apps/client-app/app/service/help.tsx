// HelpCenterPage — 帮助中心（P21 优化方案，见 第四梯队-辅助页面/P21-帮助中心页-完整方案.md）
// 结构：搜索框（真实过滤）+ 横排分类 chip（高亮过滤）+ 一体化 FAQ 列表（hairline 分隔）
//       + 紧凑联系 CTA（白底卡片，非大色块）
import { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import enLocale from '../../locales/en.json';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets, serviceEntryThemes, type ServiceEntryThemeKey } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';

const FAQ_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
type FaqId = (typeof FAQ_IDS)[number];
interface HelpCategory {
  id: 'all' | 'order' | 'payment' | 'shipping' | 'return';
  labelKey: string;
  icon: string;
  theme: ServiceEntryThemeKey;
}

// Why: P21 D6 —— FAQ↔分类映射（q1=订单状态 q2=支付 q3=退换 q4=配送 q5=发票）。
//      order 含 q5（发票申请属订单相关）；chip 条数按映射动态计算。
//      all 直接引用 FAQ_IDS 保持同源（改 FAQ_IDS 时 all 跟随）。
const CAT_FAQ_MAP: Record<HelpCategory['id'], readonly FaqId[]> = {
  all: FAQ_IDS,
  order: ['q1', 'q5'],
  payment: ['q2'],
  shipping: ['q4'],
  return: ['q3'],
};

// Why: P21 D1 —— 「All」chip 首位默认选中；其余 4 分类复用 serviceEntryThemes 色板
const CATEGORIES: HelpCategory[] = [
  { id: 'all', labelKey: 'service.help.cat.all', icon: 'apps', theme: 'info' },
  { id: 'order', labelKey: 'service.help.cat.order', icon: 'receipt_long', theme: 'info' },
  { id: 'payment', labelKey: 'service.help.cat.payment', icon: 'credit_card', theme: 'success' },
  { id: 'shipping', labelKey: 'service.help.cat.shipping', icon: 'local_shipping', theme: 'warning' },
  { id: 'return', labelKey: 'service.help.cat.return', icon: 'history', theme: 'error' },
];

/** 搜索词高亮：按 query 切分文本，匹配段单独设 warning 系样式（P21 §9.4） */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const { colors } = useTheme();
  if (!query) return <Text>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text>{text}</Text>;
  return (
    <Text>
      {text.slice(0, idx)}
      {/* 审查 Q7 —— RN Text 无法还原原型 mark 的 padding:0 2px + border-radius（方案 §9.4 接受折衷），纯背景色高亮 */}
      <Text style={{ backgroundColor: colors.semantic['warning-container'], color: colors.semantic.warning }}>
        {text.slice(idx, idx + query.length)}
      </Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

export default function HelpCenterPage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Why: expanded 折叠模式复用（P20 同款单开手风琴；默认展开首条）
  const [expanded, setExpanded] = useState<string | null>('q1');
  const [search, setSearch] = useState('');
  // Why: P21 D1 —— activeCat 真实过滤（替代旧「分类点击写 expanded」的无效交互）
  const [activeCat, setActiveCat] = useState<HelpCategory['id']>('all');

  const searchActive = search.trim().length > 0;

  // Why: P21 D3 —— 搜索匹配问题+答案文本；分类过滤叠加（search 优先显示，分类区隐藏）。
  //      审查 Q5 —— en+当前 locale 双匹配：en 工作语言关键词在任何 locale 下可命中
  //      （zh 环境搜 "payment" 不再落空）。en 文案直接读 en.json 的 faq 段
  //      （静态 import，与 src/i18n/index.ts 同源；getFixedT 在测试 mock 环境不可用）。
  const enFaq = enLocale.service?.help?.faq;
  const visibleFaqs = useMemo(() => {
    const base = CAT_FAQ_MAP[activeCat];
    if (!searchActive) return base;
    const q = search.trim().toLowerCase();
    return base.filter((id) => {
      const qKey = `service.help.faq.${id}`;
      const aKey = `service.help.faq.a${id.slice(1)}`;
      const localizedHit =
        t(qKey).toLowerCase().includes(q) ||
        t(aKey).toLowerCase().includes(q);
      if (localizedHit) return true;
      // en 兜底：zh 环境英文关键词命中；en 文案天然无 [TET] 前缀污染
      const enQuestion = enFaq?.[id as keyof typeof enFaq];
      const enAnswer = enFaq?.[`a${id.slice(1)}` as keyof typeof enFaq];
      return (
        (typeof enQuestion === 'string' && enQuestion.toLowerCase().includes(q)) ||
        (typeof enAnswer === 'string' && enAnswer.toLowerCase().includes(q))
      );
    });
  }, [activeCat, search, searchActive, t, enFaq]);

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('service.help.title')} showBack onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 搜索框（P21 D3：激活时边框变 primary） */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: searchActive ? colors.primary : colors['outline-variant'],
            },
            shadowPresets.sm,
          ]}
        >
          <Icon symbol="search" size={20} color={searchActive ? colors.primary : colors['on-surface-variant']} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('service.help.searchPlaceholder', { defaultValue: 'Search help' })}
            placeholderTextColor={colors['on-surface-variant']}
            style={[styles.searchInput, { color: colors['on-surface'] }]}
            accessibilityLabel={t('service.help.a11y.searchPlaceholder')}
            testID="help-search"
          />
          {searchActive && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              style={[styles.searchClear, { backgroundColor: colors['surface-container'] }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.clearSearch')}
            >
              <Icon symbol="close" size={14} color={colors['on-surface-variant']} />
            </Pressable>
          )}
        </View>

        {searchActive ? (
          /* 搜索态：隐藏分类区，标题 resultFor + 匹配条数（P21 D3） */
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('service.help.resultFor', { query: search.trim() })}
              </Text>
              <Text style={[styles.sectionSub, { color: colors['on-surface-variant'] }]}>
                {t('service.help.matchCount', { count: visibleFaqs.length })}
              </Text>
            </View>
            {visibleFaqs.length === 0 ? (
              /* 空态：search_off + noResult + 引导（原型 .empty） */
              <View
                style={[
                  styles.empty,
                  { backgroundColor: colors['surface-container-lowest'] },
                  shadowPresets.sm,
                ]}
              >
                <View style={styles.emptyIconWrap}>
                  <Icon symbol="search_off" size={44} color={colors['on-surface-variant']} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors['on-surface'] }]}>
                  {t('service.help.noResult')}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors['on-surface-variant'] }]}>
                  {t('service.help.noResultDesc')}
                </Text>
              </View>
            ) : (
              <FaqList
                faqIds={visibleFaqs}
                expanded={expanded}
                onToggle={setExpanded}
                query={search.trim()}
              />
            )}
          </>
        ) : (
          /* 默认态：分类 chip 行 + 一体化 FAQ 列表（P21 D1/D2） */
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('service.help.browseTitle')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeCat === cat.id;
                const count = CAT_FAQ_MAP[cat.id].length;
                const activeColor = serviceEntryThemes[cat.theme].iconBg;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      // Why: 审查 Q3 —— 切分类时重置 expanded 为新列表首条，
                      //      保证单条分类（payment/shipping/return）也有「默认展开首条」
                      setActiveCat(cat.id);
                      setExpanded(CAT_FAQ_MAP[cat.id][0] ?? null);
                    }}
                    style={({ pressed }) => [
                      styles.catChip,
                      { backgroundColor: isActive ? colors['surface-container-low'] : colors['surface-container-lowest'] },
                      isActive && { borderColor: activeColor },
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={t(cat.labelKey)}
                    testID={`help-cat-${cat.id}`}
                  >
                    <View style={[styles.catIcon, { backgroundColor: serviceEntryThemes[cat.theme].bg }]}>
                      <Icon symbol={cat.icon} size={20} color={serviceEntryThemes[cat.theme].iconBg} />
                    </View>
                    <Text style={[styles.catLabel, { color: colors['on-surface'] }]} numberOfLines={1}>
                      {t(cat.labelKey)}
                    </Text>
                    <Text style={[styles.catCount, { color: colors['on-surface-variant'] }]}>
                      {t('service.help.faqCount', { count })}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 列表标题：activeCat=all → allFaqsTitle + 条数；否则分类名 + 条数 + Clear filter */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {activeCat === 'all'
                  ? t('service.help.allFaqsTitle')
                  : t(`service.help.cat.${activeCat}`)}
              </Text>
              <Text style={[styles.sectionSub, { color: colors['on-surface-variant'] }]}>
                {t('service.help.questionCount', { count: visibleFaqs.length })}
              </Text>
              {activeCat !== 'all' && (
                <Pressable
                  onPress={() => {
                    // Why: 审查 Q3 —— 回 All 同步重置 expanded 首条（与切分类一致）
                    setActiveCat('all');
                    setExpanded(CAT_FAQ_MAP.all[0] ?? null);
                  }}
                  style={styles.clearFilterBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('service.help.clearFilter')}
                  testID="help-clear-filter"
                >
                  <Text style={[styles.clearFilterText, { color: colors['on-surface-variant'] }]}>
                    {t('service.help.clearFilter')}
                  </Text>
                  <Icon symbol="close" size={14} color={colors['on-surface-variant']} />
                </Pressable>
              )}
            </View>
            <FaqList
              faqIds={visibleFaqs}
              expanded={expanded}
              onToggle={setExpanded}
              query=""
            />
          </>
        )}

        {/* 联系 CTA（P21 D4）：紧凑横排白底卡片，非大色块 */}
        <Pressable
          onPress={() => router.push('/service/feedback')}
          style={({ pressed }) => [
            styles.contactRow,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('service.help.contactLink')}
          testID="help-contact-cs"
        >
          <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
            <Icon symbol="headset_mic" size={22} color={colors['on-primary']} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={[styles.contactTitle, { color: colors['on-surface'] }]}>
              {t('service.help.contactPrompt', { defaultValue: 'Still need help?' })}
            </Text>
            <Text style={[styles.contactDesc, { color: colors['on-surface-variant'] }]}>
              {t('service.help.contactLink', { defaultValue: 'Contact our customer service' })}
            </Text>
          </View>
          <Icon symbol="arrow_forward" size={20} color={colors['on-surface-variant']} />
        </Pressable>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

/** 一体化 FAQ 列表（P21 D2）：单容器 + hairline 分隔，Q 徽章展开态 primary 实底 */
function FaqList({
  faqIds,
  expanded,
  onToggle,
  query,
}: {
  faqIds: readonly FaqId[];
  expanded: string | null;
  onToggle: (id: string | null) => void;
  query: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.faqList,
        { backgroundColor: colors['surface-container-lowest'] },
        shadowPresets.sm,
      ]}
    >
      {faqIds.map((id, idx) => {
        const isOpen = expanded === id;
        return (
          <View
            key={id}
            style={idx < faqIds.length - 1 ? [styles.faqItem, { borderBottomColor: colors['outline-variant'] }] : styles.faqItem}
          >
            <Pressable
              testID={`faq-${id}`}
              onPress={() => onToggle(isOpen ? null : id)}
              style={({ pressed }) => [styles.faqQ, pressed && { backgroundColor: colors['surface-container'] }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={t(`service.help.faq.${id}`)}
            >
              <View
                style={[
                  styles.qBadge,
                  { backgroundColor: isOpen ? colors.primary : colors['surface-container'] },
                ]}
              >
                <Text style={[styles.qBadgeText, { color: isOpen ? colors['on-primary'] : colors.primary }]}>
                  Q
                </Text>
              </View>
              <Text style={[styles.question, { color: colors['on-surface'] }]}>
                <HighlightedText text={t(`service.help.faq.${id}`)} query={query} />
              </Text>
              <Icon
                symbol={isOpen ? 'expand_more' : 'chevron_right'}
                size={20}
                color={isOpen ? colors.primary : colors['on-surface-variant']}
              />
            </Pressable>
            {isOpen && (
              <View style={styles.faqAInner}>
                {/* Why: 审查 Q1 —— success 浅底用 success-container token（dark 跟随），
                    替代硬编码 rgba tint */}
                <View style={[styles.aBadge, { backgroundColor: colors.semantic['success-container'] }]}>
                  <Text style={[styles.aBadgeText, { color: serviceEntryThemes.success.iconBg }]}>A</Text>
                </View>
                <Text style={[styles.answer, { color: colors['on-surface-variant'] }]}>
                  {t(`service.help.faq.a${id.slice(1)}`)}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  // 搜索框（原型 .search-bar：12px 圆角 + 1.5px 边框）
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    ...typography['body-md'],
    paddingVertical: 4,
  },
  searchClear: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
  sectionSub: {
    fontSize: 11,
  },
  // 分类 chip 行（原型 .cat-row：横滑 + 紧凑小卡）
  catRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: 2,
  },
  catChip: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.md - 4,
    borderRadius: borderRadius.lg,
    minWidth: 72,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  catCount: {
    fontSize: 10,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    paddingHorizontal: spacing.xs,
  },
  clearFilterText: {
    fontSize: 11,
  },
  // 一体化 FAQ 列表（原型 .faq-list：单容器 + hairline 分隔）
  faqList: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqQ: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    minHeight: 52,
  },
  qBadge: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  question: {
    ...typography['body-md'],
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  faqAInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md - 2,
    paddingLeft: spacing.md + 36, // 对齐问题文字（26 徽章 + 10 间距）
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
  },
  aBadge: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  answer: {
    ...typography['body-sm'],
    fontSize: 13,
    lineHeight: 21,
    flex: 1,
  },
  // 搜索空态（原型 .empty）
  empty: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xxl + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  emptyIconWrap: {
    opacity: 0.35,
  },
  emptyTitle: {
    ...typography['body-md'],
    fontWeight: '600',
    marginTop: spacing.sm + 2,
  },
  emptyDesc: {
    ...typography['body-sm'],
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  // 联系 CTA（原型 .contact-bar：紧凑横排白底）
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactTitle: {
    ...typography['body-md'],
    fontWeight: '700',
    fontSize: 14,
  },
  contactDesc: {
    ...typography['body-sm'],
    fontSize: 11,
    lineHeight: 15,
  },
});
