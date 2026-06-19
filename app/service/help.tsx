// ⚠️ 无 HTML 原型，参考 ProfilePage 推导实现，待设计确认
// HelpCenterPage — 帮助中心（参考 ProfilePage.html 的列表样式）
// D.9: PrimaryHeader + 搜索框 + 分类网格 + 热门 FAQ + 联系客服
import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';

const FAQ_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

interface HelpCategory {
  id: string;
  labelKey: string;
  icon: string;
  bg: string;
  iconBg: string;
}

const CATEGORIES: HelpCategory[] = [
  {
    id: 'order',
    labelKey: 'service.help.cat.order',
    icon: 'receipt_long',
    bg: '#dbeafe',
    iconBg: '#3b82f6',
  },
  {
    id: 'payment',
    labelKey: 'service.help.cat.payment',
    icon: 'credit_card',
    bg: '#d1fae5',
    iconBg: '#10b981',
  },
  {
    id: 'shipping',
    labelKey: 'service.help.cat.shipping',
    icon: 'local_shipping',
    bg: '#fef3c7',
    iconBg: '#f59e0b',
  },
  {
    id: 'return',
    labelKey: 'service.help.cat.return',
    icon: 'history',
    bg: '#fee2e2',
    iconBg: '#ef4444',
  },
];

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<string | null>('q1');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('service.help.title')} showBack onBackPress={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 搜索框 */}
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.sm,
          ]}
        >
          <Icon symbol="search" size={20} color={colors['on-surface-variant']} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('service.help.searchPlaceholder', { defaultValue: 'Search help' })}
            placeholderTextColor={colors['on-surface-variant']}
            style={[styles.searchInput, { color: colors['on-surface'] }]}
            accessibilityLabel="Search help center"
            testID="help-search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon symbol="close" size={18} color={colors['on-surface-variant']} />
            </Pressable>
          )}
        </View>

        {/* 分类网格（2x2） */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setExpanded(cat.id)}
              style={({ pressed }) => [
                styles.categoryCard,
                { backgroundColor: colors['surface-container-lowest'] },
                shadowPresets.sm,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(cat.labelKey)}
              testID={`help-cat-${cat.id}`}
            >
              <View style={[styles.categoryIconWrap, { backgroundColor: cat.bg }]}>
                <View style={[styles.categoryIconInner, { backgroundColor: cat.iconBg }]}>
                  <Icon symbol={cat.icon} size={20} color="#ffffff" />
                </View>
              </View>
              <Text
                style={[styles.categoryLabel, { color: colors['on-surface'] }]}
                numberOfLines={1}
              >
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 热门 FAQ 标题 */}
        <View style={styles.sectionHeader}>
          <Icon symbol="star" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('service.help.hotTitle', { defaultValue: 'Hot FAQs' })}
          </Text>
        </View>

        {/* FAQ 折叠列表 */}
        <View style={styles.list}>
          {FAQ_IDS.map((id) => {
            const isOpen = expanded === id;
            return (
              <View
                key={id}
                style={[
                  styles.faqCard,
                  { backgroundColor: colors['surface-container-lowest'] },
                  shadowPresets.sm,
                ]}
              >
                <Pressable
                  testID={`faq-${id}`}
                  onPress={() => setExpanded(isOpen ? null : id)}
                  style={({ pressed }) => [styles.faqHeader, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={t(`service.help.faq.${id}`)}
                >
                  <View
                    style={[
                      styles.qIconWrap,
                      { backgroundColor: isOpen ? colors.primary : 'rgba(150,24,19,0.08)' },
                    ]}
                  >
                    <Text style={[styles.qIcon, { color: isOpen ? '#ffffff' : colors.primary }]}>
                      Q
                    </Text>
                  </View>
                  <Text style={[styles.question, { color: colors['on-surface'] }]}>
                    {t(`service.help.faq.${id}`)}
                  </Text>
                  <Icon
                    symbol={isOpen ? 'expand_more' : 'chevron_right'}
                    size={20}
                    color={colors['on-surface-variant']}
                  />
                </Pressable>
                {isOpen && (
                  <View
                    style={[
                      styles.answerBox,
                      {
                        backgroundColor: colors['surface-container-low'],
                        borderColor: colors['outline-variant'],
                      },
                    ]}
                  >
                    <View style={[styles.aIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                      <Text style={[styles.aIcon, { color: '#10b981' }]}>A</Text>
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

        {/* 联系客服 CTA */}
        <Pressable
          onPress={() => router.push('/service')}
          style={({ pressed }) => [
            styles.contactCard,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('service.help.contactLink')}
          testID="help-contact-cs"
        >
          <View style={styles.contactPattern} pointerEvents="none">
            <TaisPattern width={400} height={100} opacity={0.2} />
          </View>
          <View style={styles.contactIconWrap}>
            <Icon symbol="headset_mic" size={24} color="#ffffff" />
          </View>
          <View style={styles.contactTextBox}>
            <Text style={styles.contactTitle}>
              {t('service.help.contactPrompt', { defaultValue: 'Still need help?' })}
            </Text>
            <Text style={styles.contactDesc}>
              {t('service.help.contactLink', { defaultValue: 'Contact our customer service' })}
            </Text>
          </View>
          <Icon symbol="arrow_forward" size={20} color="#ffffff" />
        </Pressable>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    ...typography['body-md'],
    paddingVertical: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconInner: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
  },
  faqCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  qIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qIcon: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  question: {
    ...typography['body-md'],
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  answerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aIconWrap: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aIcon: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  answer: {
    ...typography['body-sm'],
    lineHeight: 20,
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  contactPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: 2,
  },
  contactTextBox: {
    flex: 1,
    gap: 2,
    zIndex: 2,
  },
  contactTitle: {
    color: '#ffffff',
    ...typography['body-md'],
    fontWeight: '700',
  },
  contactDesc: {
    color: 'rgba(255,255,255,0.85)',
    ...typography['body-sm'],
  },
});
