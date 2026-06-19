// ⚠️ 无 HTML 原型，参考 ProfilePage 推导实现，待设计确认
// CustomerServicePage — 客服入口（参考 ProfilePage.html 的列表样式 + tais-pattern）
// D.7: PrimaryHeader + 服务入口卡片 + 工作时间 + FAQ + 联系方式
import { StyleSheet, View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';

interface ChannelCard {
  id: 'online' | 'phone' | 'email' | 'faq';
  labelKey: string;
  descKey: string;
  icon: string;
  bg: string;
  iconBg: string;
  onPress: () => void;
}

interface FaqEntry {
  id: string;
  labelKey: string;
  descKey: string;
  icon: string;
  route?: string;
}

export default function CustomerServicePage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const channels: ChannelCard[] = [
    {
      id: 'online',
      labelKey: 'service.channels.online',
      descKey: 'service.channels.onlineDesc',
      icon: 'headset_mic',
      bg: '#dbeafe',
      iconBg: '#3b82f6',
      onPress: () => router.push('/service/feedback'),
    },
    {
      id: 'phone',
      labelKey: 'service.channels.phone',
      descKey: 'service.channels.phoneDesc',
      icon: 'call',
      bg: '#d1fae5',
      iconBg: '#10b981',
      onPress: () => Linking.openURL('tel:+67077000000'),
    },
    {
      id: 'email',
      labelKey: 'service.channels.email',
      descKey: 'service.channels.emailDesc',
      icon: 'mail',
      bg: '#fef3c7',
      iconBg: '#f59e0b',
      onPress: () => Linking.openURL('mailto:support@meimart.tl'),
    },
    {
      id: 'faq',
      labelKey: 'service.channels.faq',
      descKey: 'service.channels.faqDesc',
      icon: 'help',
      bg: '#fee2e2',
      iconBg: '#ef4444',
      onPress: () => router.push('/service/help'),
    },
  ];

  const faqs: FaqEntry[] = [
    {
      id: 'order',
      labelKey: 'service.categories.order',
      descKey: 'service.categories.orderDesc',
      icon: 'receipt_long',
      route: '/(main)/orders',
    },
    {
      id: 'payment',
      labelKey: 'service.categories.payment',
      descKey: 'service.categories.paymentDesc',
      icon: 'credit_card',
      route: '/order/payment',
    },
    {
      id: 'product',
      labelKey: 'service.categories.product',
      descKey: 'service.categories.productDesc',
      icon: 'shopping_cart',
      route: '/(main)/categories',
    },
    {
      id: 'feedback',
      labelKey: 'service.categories.feedback',
      descKey: 'service.categories.feedbackDesc',
      icon: 'edit',
      route: '/service/feedback',
    },
    {
      id: 'help',
      labelKey: 'service.categories.help',
      descKey: 'service.categories.helpDesc',
      icon: 'help',
      route: '/service/help',
    },
  ];

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('service.title')} showBack onBackPress={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Block */}
        <View style={[styles.greetingCard, { backgroundColor: colors.primary }, shadowPresets.md]}>
          <View style={styles.greetingPattern} pointerEvents="none">
            <TaisPattern width={400} height={120} opacity={0.2} />
          </View>
          <View style={styles.greetingIconWrap}>
            <Icon symbol="headset_mic" size={32} color="#ffffff" />
          </View>
          <View style={styles.greetingTextBox}>
            <Text style={styles.greetingTitle} accessibilityRole="header">
              {t('service.greetingTitle')}
            </Text>
            <Text style={styles.greetingDesc}>{t('service.greetingDesc')}</Text>
          </View>
        </View>

        {/* 4 个服务入口卡片（2x2 网格） */}
        <View style={styles.channelsGrid}>
          {channels.map((ch) => (
            <Pressable
              key={ch.id}
              testID={`cs-channel-${ch.id}`}
              onPress={ch.onPress}
              style={({ pressed }) => [
                styles.channelCard,
                { backgroundColor: colors['surface-container-lowest'] },
                shadowPresets.sm,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(ch.labelKey)}
            >
              <View style={[styles.channelIconWrap, { backgroundColor: ch.bg }]}>
                <View style={[styles.channelIconInner, { backgroundColor: ch.iconBg }]}>
                  <Icon symbol={ch.icon} size={20} color="#ffffff" />
                </View>
              </View>
              <Text
                style={[styles.channelLabel, { color: colors['on-surface'] }]}
                numberOfLines={1}
              >
                {t(ch.labelKey)}
              </Text>
              <Text
                style={[styles.channelDesc, { color: colors['on-surface-variant'] }]}
                numberOfLines={2}
              >
                {t(ch.descKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 工作时间卡片 */}
        <View
          style={[
            styles.workHourCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.workHourRow}>
            <View style={styles.workHourIconWrap}>
              <Icon symbol="schedule" size={20} color={colors.primary} />
            </View>
            <View style={styles.workHourTextBox}>
              <Text style={[styles.workHourTitle, { color: colors['on-surface'] }]}>
                {t('service.workHours', { defaultValue: 'Working Hours' })}
              </Text>
              <Text style={[styles.workHourDesc, { color: colors['on-surface-variant'] }]}>
                {t('service.workHoursDesc', {
                  defaultValue: 'Mon - Sun · 08:00 - 22:00 (Dili time)',
                })}
              </Text>
            </View>
            <View style={[styles.onlinePill, { backgroundColor: '#d1fae5' }]}>
              <View style={[styles.onlineDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.onlineText}>
                {t('service.online', { defaultValue: 'Online' })}
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ 入口列表 */}
        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.faqTitle')}
        </Text>
        <View
          style={[
            styles.faqCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          {faqs.map((item, idx) => (
            <Pressable
              key={item.id}
              testID={`cs-entry-${item.id}`}
              onPress={() => item.route && router.push(item.route)}
              style={({ pressed }) => [
                styles.entryRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors['outline-variant'],
                },
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
            >
              <View
                style={[styles.entryIconWrap, { backgroundColor: colors['surface-container'] }]}
              >
                <Icon symbol={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.entryTextBox}>
                <Text style={[styles.entryLabel, { color: colors['on-surface'] }]}>
                  {t(item.labelKey)}
                </Text>
                <Text style={[styles.entryDesc, { color: colors['on-surface-variant'] }]}>
                  {t(item.descKey)}
                </Text>
              </View>
              <Icon symbol="chevron_right" size={20} color={colors['on-surface-variant']} />
            </Pressable>
          ))}
        </View>

        {/* 联系方式卡片 */}
        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.contactTitle')}
        </Text>
        <View
          style={[
            styles.contactCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <ContactRow
            icon="call"
            label={t('service.callHotline')}
            value="+670 7700 0000"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-call"
            onPress={() => Linking.openURL('tel:+67077000000')}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <ContactRow
            icon="mail"
            label={t('service.email')}
            value="support@meimart.tl"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-email"
            onPress={() => Linking.openURL('mailto:support@meimart.tl')}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <ContactRow
            icon="notifications"
            label={t('service.notifications.title')}
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-notifications"
            onPress={() => router.push('/service/notifications')}
          />
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function ContactRow({
  icon,
  label,
  value,
  color,
  textColor,
  subColor,
  onPress,
  testID,
}: {
  icon: string;
  label: string;
  value?: string;
  color: string;
  textColor: string;
  subColor: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.contactRow, pressed && { opacity: 0.6 }]}
    >
      <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(150,24,19,0.08)' }]}>
        <Icon symbol={icon} size={20} color={color} />
      </View>
      <Text style={[styles.contactLabel, { color: textColor, flex: 1 }]}>{label}</Text>
      {value && <Text style={[styles.contactValue, { color: subColor }]}>{value}</Text>}
      <Icon symbol="chevron_right" size={20} color={subColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  greetingPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greetingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    zIndex: 2,
  },
  greetingTextBox: {
    flex: 1,
    gap: 4,
    zIndex: 2,
  },
  greetingTitle: {
    ...typography.h3,
    color: '#ffffff',
    fontWeight: '700',
  },
  greetingDesc: {
    ...typography['body-sm'],
    color: 'rgba(255,255,255,0.85)',
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  channelCard: {
    width: '47%',
    flexGrow: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  channelIconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelIconInner: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLabel: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  channelDesc: {
    ...typography['label-caps'],
    fontSize: 10,
    textAlign: 'center',
  },
  workHourCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  workHourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workHourIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(150,24,19,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workHourTextBox: {
    flex: 1,
    gap: 2,
  },
  workHourTitle: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  workHourDesc: {
    ...typography['body-sm'],
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  sectionTitle: {
    ...typography['label-caps'],
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  faqCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  entryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTextBox: {
    flex: 1,
    gap: 2,
  },
  entryLabel: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  entryDesc: {
    ...typography['body-sm'],
  },
  contactCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.md,
    minHeight: 48,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  contactValue: {
    ...typography['body-sm'],
  },
});
