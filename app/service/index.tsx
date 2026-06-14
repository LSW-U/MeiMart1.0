import { StyleSheet, View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
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
  id: string;
  label: string;
  icon: IconName;
  desc: string;
  route?: string;
}

const ENTRIES: EntryItem[] = [
  {
    id: 'order',
    label: '订单问题',
    icon: 'clipboard-list',
    desc: '查询订单、物流、退换货',
    route: '/(main)/orders',
  },
  {
    id: 'payment',
    label: '支付问题',
    icon: 'credit-card',
    desc: '支付失败、退款进度',
    route: '/order/payment',
  },
  {
    id: 'product',
    label: '商品咨询',
    icon: 'shopping',
    desc: '商品真假、保质期',
    route: '/service',
  },
  {
    id: 'feedback',
    label: '意见反馈',
    icon: 'message-alert',
    desc: '产品建议、bug 反馈',
    route: '/service/feedback',
  },
  {
    id: 'help',
    label: '帮助中心',
    icon: 'help-circle',
    desc: '常见问题解答',
    route: '/service/help',
  },
];

export default function CustomerServicePage() {
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="客服中心" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="headset" size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.headerTitle, { color: colors['on-surface'] }]}
                accessibilityRole="header"
              >
                你好，需要帮忙吗？
              </Text>
              <Text style={[styles.headerDesc, { color: colors['on-surface-variant'] }]}>
                我们随时为你服务
              </Text>
            </View>
          </View>
        </Card>

        <TaisDivider />

        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>常见问题</Text>
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
            >
              <MaterialCommunityIcons name={item.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryLabel, { color: colors['on-surface'] }]}>
                  {item.label}
                </Text>
                <Text style={[styles.entryDesc, { color: colors['on-surface-variant'] }]}>
                  {item.desc}
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

        <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>联系方式</Text>
        <Card>
          <PressableRow
            icon="phone"
            label="客服热线"
            value="+670 123 4567"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-call"
            onPress={() => Linking.openURL('tel:+6701234567')}
          />
          <PressableRow
            icon="email"
            label="客服邮箱"
            value="support@meimart.tl"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="cs-email"
            onPress={() => Linking.openURL('mailto:support@meimart.tl')}
          />
          <PressableRow
            icon="bell"
            label="消息通知"
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
