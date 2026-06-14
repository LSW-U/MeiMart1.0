import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Card } from '@/components/ui/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FAQS = [
  {
    id: 'q1',
    question: '如何查询订单状态？',
    answer: '进入「我的订单」页面，点击对应订单可查看详细状态和物流信息。',
  },
  {
    id: 'q2',
    question: '支持哪些支付方式？',
    answer: '目前支持微信支付、支付宝、货到付款等多种支付方式。',
  },
  {
    id: 'q3',
    question: '退换货政策是？',
    answer: '大部分商品支持 7 天无理由退换货，详情请查看订单详情页的售后入口。',
  },
  {
    id: 'q4',
    question: '配送范围和时间？',
    answer: '帝力市区当日达，其他地区 2-3 日送达，部分偏远地区需更长时间。',
  },
  {
    id: 'q5',
    question: '如何申请发票？',
    answer: '在结算页面可勾选「需要发票」并填写抬头信息，电子发票会在 24 小时内发送到邮箱。',
  },
];

export default function HelpCenterPage() {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState<string | null>('q1');

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="帮助中心" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: colors['on-surface-variant'] }]}>
          以下是用户最常问的问题，点击展开查看详细解答
        </Text>
        <View style={styles.list}>
          {FAQS.map((faq) => {
            const isOpen = expanded === faq.id;
            return (
              <Card key={faq.id}>
                <Pressable
                  testID={`faq-${faq.id}`}
                  onPress={() => setExpanded(isOpen ? null : faq.id)}
                  style={({ pressed }) => [styles.faqHeader, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                >
                  <Text style={[styles.question, { color: colors['on-surface'] }]}>
                    {faq.question}
                  </Text>
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors['on-surface-variant']}
                  />
                </Pressable>
                {isOpen && (
                  <Text style={[styles.answer, { color: colors['on-surface-variant'] }]}>
                    {faq.answer}
                  </Text>
                )}
              </Card>
            );
          })}
        </View>
        <View style={styles.contactBox}>
          <Text style={[styles.contactText, { color: colors['on-surface-variant'] }]}>
            没找到答案？
          </Text>
          <Pressable onPress={() => router.push('/service')}>
            <Text style={[styles.contactLink, { color: colors.primary }]}>联系在线客服</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  intro: { ...typography['body-sm'], paddingHorizontal: spacing.xs },
  list: { gap: spacing.md },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  question: { ...typography['body-md'], fontWeight: '600', flex: 1 },
  answer: {
    ...typography['body-sm'],
    lineHeight: 22,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  contactText: { ...typography['body-sm'] },
  contactLink: { ...typography['body-sm'], fontWeight: '600' },
});
