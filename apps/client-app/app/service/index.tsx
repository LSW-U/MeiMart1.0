// CustomerServicePage — 客服入口（P20 优化方案，见 第四梯队-辅助页面/P20-客服页-完整方案.md）
// 结构：greeting 瘦身条 + My Orders 快捷入口 + Contact 卡（online 主行 + phone/email 副行）
//       + FAQ 真折叠（复用 help.faq q1-q4）+ 底部工作时间一行
import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets, serviceEntryThemes, type ServiceEntryThemeKey } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';

interface Shortcut {
  id: 'orders' | 'refunds' | 'tracking';
  icon: string;
  theme: ServiceEntryThemeKey;
  route: string;
}

// Why: P20 D1 —— 电商客服页最高频诉求入口；路由方案已核实存在
const SHORTCUTS: Shortcut[] = [
  { id: 'orders', icon: 'receipt_long', theme: 'info', route: '/(main)/orders' },
  { id: 'refunds', icon: 'assignment_return', theme: 'warning', route: '/(main)/refunds' },
  { id: 'tracking', icon: 'local_shipping', theme: 'success', route: '/order/tracking' },
];

// Why: P20 D3（Q1 拍板）—— 复用 help 中心前 4 条 FAQ 文案（零新增 key），
//      接受第 4 条与原型 change address 主题不一致（显示 delivery area）
const FAQ_IDS = ['q1', 'q2', 'q3', 'q4'] as const;

export default function CustomerServicePage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Why: FAQ 折叠交互复用 help.tsx:56 模式（单开手风琴）
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('service.title')} showBack onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting 瘦身条（D4）：44px 头像（primary 底 + tais 纹理）+ 文案 + 在线徽章 */}
        <View
          style={[
            styles.greet,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.greetAvatar}>
            <View style={styles.greetAvatarPattern} pointerEvents="none">
              <TaisPattern width={88} height={88} opacity={0.35} />
            </View>
            <Icon symbol="support_agent" size={22} color="#ffffff" />
          </View>
          <View style={styles.greetTextBox}>
            <Text style={[styles.greetTitle, { color: colors['on-surface'] }]}>
              {t('service.greetingTitle')}
            </Text>
            <Text style={[styles.greetDesc, { color: colors['on-surface-variant'] }]}>
              {t('service.greetingDesc')}
            </Text>
          </View>
          <View
            style={[
              styles.greetPill,
              { backgroundColor: colors.semantic['positive-container'] },
            ]}
          >
            <View style={[styles.greetPillDot, { backgroundColor: colors.semantic.positive }]} />
            <Text style={[styles.greetPillText, { color: colors.semantic.positive }]}>
              {t('service.online')}
            </Text>
          </View>
        </View>

        {/* My Orders 快捷入口（D1）：3 横排 */}
        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.shortcut.orders')}
        </Text>
        <View style={styles.shortcuts}>
          {SHORTCUTS.map((sc) => (
            <Pressable
              key={sc.id}
              testID={`cs-shortcut-${sc.id}`}
              onPress={() => router.push(sc.route as never)}
              style={({ pressed }) => [
                styles.shortcut,
                { backgroundColor: colors['surface-container-lowest'] },
                shadowPresets.sm,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(`service.shortcut.${sc.id}`)}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: serviceEntryThemes[sc.theme].iconBg }]}>
                <Icon symbol={sc.icon} size={22} color="#ffffff" />
              </View>
              <Text style={[styles.shortcutLabel, { color: colors['on-surface'] }]}>
                {t(`service.shortcut.${sc.id}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Contact 卡（D2）：Online Chat 主行（primary + tais 纹理）+ phone/email 副行 */}
        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.contactTitle')}
        </Text>
        <View style={[styles.contact, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.sm]}>
          <Pressable
            testID="cs-contact-online"
            onPress={() => router.push('/service/feedback')}
            style={({ pressed }) => [
              styles.contactMain,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('service.contact.online')}
          >
            <View style={styles.contactMainPattern} pointerEvents="none">
              <TaisPattern width={400} height={80} opacity={0.18} />
            </View>
            <View style={styles.contactMainIcon}>
              <Icon symbol="chat" size={26} color="#ffffff" />
            </View>
            <View style={styles.contactMainText}>
              <Text style={styles.contactMainLabel}>{t('service.contact.online')}</Text>
              <Text style={styles.contactMainDesc}>{t('service.contact.onlineDesc')}</Text>
            </View>
            <View style={styles.contactMainGo}>
              <Icon symbol="chevron_right" size={18} color="#ffffff" />
            </View>
          </Pressable>
          <View style={styles.contactSub}>
            <Pressable
              testID="cs-contact-phone"
              onPress={() => Linking.openURL('tel:+67077000000')}
              style={({ pressed }) => [styles.contactSubRow, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('service.callHotline')}
            >
              <View style={[styles.contactSubIcon, { backgroundColor: serviceEntryThemes.success.bg }]}>
                <Icon symbol="call" size={20} color={serviceEntryThemes.success.iconBg} />
              </View>
              <Text style={[styles.contactSubLabel, { color: colors['on-surface'] }]}>
                {t('service.callHotline')}
              </Text>
              <Text style={[styles.contactSubValue, { color: colors['on-surface-variant'] }]}>
                +670 7700 0000
              </Text>
            </Pressable>
            <View style={[styles.contactSubDivider, { backgroundColor: colors['outline-variant'] }]} />
            <Pressable
              testID="cs-contact-email"
              onPress={() => Linking.openURL('mailto:support@meimart.tl')}
              style={({ pressed }) => [styles.contactSubRow, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('service.email')}
            >
              <View style={[styles.contactSubIcon, { backgroundColor: serviceEntryThemes.warning.bg }]}>
                <Icon symbol="mail" size={20} color={serviceEntryThemes.warning.iconBg} />
              </View>
              <Text style={[styles.contactSubLabel, { color: colors['on-surface'] }]}>
                {t('service.email')}
              </Text>
              <Text style={[styles.contactSubValue, { color: colors['on-surface-variant'] }]}>
                support@meimart.tl
              </Text>
            </Pressable>
          </View>
        </View>

        {/* FAQ 真折叠（D3）：4 条 + All topics 入口 */}
        <View style={styles.faqHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('service.faqTitle')}
          </Text>
          <Pressable
            testID="cs-faq-all"
            onPress={() => router.push('/service/help')}
            style={styles.faqAllBtn}
            accessibilityRole="button"
            accessibilityLabel={t('service.help.title')}
          >
            <Text style={[styles.faqAllText, { color: colors['on-surface-variant'] }]}>
              {t('service.help.title')}
            </Text>
            <Icon symbol="chevron_right" size={15} color={colors['on-surface-variant']} />
          </Pressable>
        </View>
        <View style={[styles.faqList, { backgroundColor: colors['surface-container-lowest'] }, shadowPresets.sm]}>
          {FAQ_IDS.map((id, idx) => {
            const isOpen = expanded === id;
            return (
              <View
                key={id}
                style={[
                  styles.faqItem,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors['outline-variant'] },
                ]}
              >
                <Pressable
                  testID={`cs-faq-${id}`}
                  onPress={() => setExpanded(isOpen ? null : id)}
                  style={({ pressed }) => [styles.faqQ, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={t(`service.help.faq.${id}`)}
                >
                  <View style={[styles.faqNum, { backgroundColor: colors['surface-container'] }]}>
                    <Text style={[styles.faqNumText, { color: colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.faqQuestion, { color: colors['on-surface'] }]}>
                    {t(`service.help.faq.${id}`)}
                  </Text>
                  <Icon
                    symbol="expand_more"
                    size={20}
                    color={colors['on-surface-variant']}
                  />
                  {/* Why: 展开态语义由 accessibilityState.expanded 表达；原型箭头 rotate 动效 RN 侧用
                      Icon 无 transform prop，保持静态箭头（原型 .ar rotate 180deg 为 web 过渡装饰） */}
                </Pressable>
                {isOpen && (
                  <Text style={[styles.faqAnswer, { color: colors['on-surface-variant'] }]}>
                    {t(`service.help.faq.a${id.slice(1)}`)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* 底部工作时间一行（D5）：schedule 图标 + 时间 + online 徽章语义弱化为纯文字 */}
        <View style={styles.workHoursRow}>
          <Icon symbol="schedule" size={14} color={colors['on-surface-variant']} />
          <Text style={[styles.workHoursText, { color: colors['on-surface-variant'] }]}>
            {t('service.workHoursDesc')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  // Greeting 瘦身条（原型 .greet）
  greet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: borderRadius.xl,
  },
  greetAvatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: '#961813', // 原因：primary 实心底承载 tais 纹理，dark 不变（文化元素固定色）
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greetAvatarPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greetTextBox: {
    flex: 1,
    gap: 2,
  },
  greetTitle: {
    ...typography['body-md'],
    fontWeight: '700',
    fontSize: 15,
  },
  greetDesc: {
    ...typography['body-sm'],
    fontSize: 11,
    lineHeight: 15,
  },
  greetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  greetPillDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  greetPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    ...typography['label-caps'],
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  // 快捷入口（原型 .shortcuts / .sc）
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcut: {
    flex: 1,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    gap: spacing.sm,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    ...typography['body-sm'],
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  // Contact 卡（原型 .contact）
  contact: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  contactMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  contactMainPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  contactMainIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.22)', // 原因：primary 主卡上的白 22% 图标底（原型 .ci），dark 不变
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  contactMainText: {
    flex: 1,
    gap: 2,
    zIndex: 2,
  },
  contactMainLabel: {
    ...typography['body-md'],
    fontWeight: '700',
    fontSize: 15,
    color: '#ffffff',
  },
  contactMainDesc: {
    ...typography['body-sm'],
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.85)', // 原因：primary 主卡白 85% 副文字（原型 .d），dark 不变
  },
  contactMainGo: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.25)', // 原因：primary 主卡白 25% 箭头底（原型 .go），dark 不变
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  contactSub: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  contactSubRow: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.sm,
  },
  contactSubIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactSubLabel: {
    ...typography['body-sm'],
    fontWeight: '600',
    fontSize: 12,
  },
  contactSubValue: {
    fontSize: 11,
  },
  contactSubDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  // FAQ 折叠（原型 .faq-list / .faq）
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  faqAllText: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  faqList: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  faqItem: {
    // 分隔线运行时注入（idx > 0）
  },
  faqQ: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    minHeight: 52,
  },
  faqNum: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  faqQuestion: {
    ...typography['body-md'],
    flex: 1,
    fontWeight: '600',
    fontSize: 13,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md + 34, // 对齐问题文字（22 数字圈 + 10 间距）
  },
  // 底部工作时间（原型最后一行）
  workHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
  },
  workHoursText: {
    fontSize: 11,
  },
});
