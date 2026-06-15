import { StyleSheet, View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EntryItem {
  id: 'order' | 'payment' | 'product' | 'feedback' | 'help';
  labelKey: string;
  descKey: string;
  icon: IconName;
  route?: string;
}

const ENTRIES: EntryItem[] = [
  {
    id: 'order',
    labelKey: 'service.categories.order',
    descKey: 'service.categories.orderDesc',
    icon: 'clipboard-list',
    route: '/(main)/orders',
  },
  {
    id: 'payment',
    labelKey: 'service.categories.payment',
    descKey: 'service.categories.paymentDesc',
    icon: 'credit-card',
    route: '/order/payment',
  },
  {
    id: 'product',
    labelKey: 'service.categories.product',
    descKey: 'service.categories.productDesc',
    icon: 'shopping',
    route: '/service',
  },
  {
    id: 'feedback',
    labelKey: 'service.categories.feedback',
    descKey: 'service.categories.feedbackDesc',
    icon: 'message-alert',
    route: '/service/feedback',
  },
  {
    id: 'help',
    labelKey: 'service.categories.help',
    descKey: 'service.categories.helpDesc',
    icon: 'help-circle',
    route: '/service/help',
  },
];

export default function CustomerServicePage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('service.title')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="headset" size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.headerTitle, { color: colors['on-surface'] }]}
                accessibilityRole="header"
              >
                {t('service.greetingTitle')}
              </Text>
              <Text style={[styles.headerDesc, { color: colors['on-surface-variant'] }]}>
                {t('service.greetingDesc')}
              </Text>
            </View>
          </View>
        </Card>

        <TaisDivider />

        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.faqTitle')}
        </Text>
        <Card>
          {ENTRIES.map((item, idx) => (
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
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryLabel, { color: colors['on-surface'] }]}>
                  {t(item.labelKey)}
                </Text>
                <Text style={[styles.entryDesc, { color: colors['on-surface-variant'] }]}>
                  {t(item.descKey)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={colors['on-surface-variant']}
              />
            </Pressable>
          ))}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
          {t('service.contactTitle')}
        </Text>
        <Card>
          <PressableRow
            icon="phone"
            label={t('service.callHotline')}
            value="+670 123 4567"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-call"
            onPress={() => Linking.openURL('tel:+6701234567')}
          />
          <PressableRow
            icon="email"
            label={t('service.email')}
            value="support@meimart.tl"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-email"
            onPress={() => Linking.openURL('mailto:support@meimart.tl')}
          />
          <PressableRow
            icon="bell"
            label={t('service.notifications.title')}
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-notifications"
            onPress={() => router.push('/service/notifications')}
          />
        </Card>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function PressableRow({
  icon,
  label,
  value,
  color,
  textColor,
  subColor,
  onPress,
  testID,
}: {
  icon: IconName;
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
      style={({ pressed }) => [
        styles.entryRow,
        { borderTopColor: subColor, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.entryLabel, { color: textColor, flex: 1 }]}>{label}</Text>
      {value && <Text style={[styles.entryValue, { color: subColor }]}>{value}</Text>}
      <MaterialCommunityIcons name="chevron-right" size={20} color={subColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTitle: { ...typography.h3, fontWeight: '700' },
  headerDesc: { ...typography['body-sm'] },
  sectionTitle: { ...typography['label-caps'], paddingHorizontal: spacing.xs },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryLabel: { ...typography['body-md'], fontWeight: '500' },
  entryDesc: { ...typography['body-sm'] },
  entryValue: { ...typography['body-sm'] },
});
