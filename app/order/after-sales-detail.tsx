import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TimelineStep } from '@/components/business/TimelineStep';
import { PriceText } from '@/components/ui/PriceText';

const STEPS = [
  { status: '申请已提交', description: '等待商家审核', timestamp: '2026-06-13 10:00' },
  { status: '商家审核中', description: '商家正在审核申请', timestamp: '2026-06-13 14:00' },
  { status: '审核通过', description: '同意退款，处理中', timestamp: '2026-06-14 09:00' },
  { status: '退款完成', description: '退款已原路返回', timestamp: '2026-06-14 11:00' },
];

export default function AfterSalesDetailPage() {
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="售后详情" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.statusBox}>
            <Text style={[styles.statusText, { color: colors.primary }]} accessibilityRole="header">
              处理中
            </Text>
            <Text style={[styles.statusDesc, { color: colors['on-surface-variant'] }]}>
              商家已同意退款申请，正在处理
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>退款金额</Text>
          <PriceText value={25.9} size="lg" />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>处理进度</Text>
          <TimelineStep steps={STEPS} currentIndex={2} />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>申请信息</Text>
          <InfoRow
            label="申请单号"
            value="AS202606130001"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <InfoRow
            label="申请原因"
            value="商品质量问题"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <InfoRow
            label="申请时间"
            value="2026-06-13 10:00"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
        </Card>

        <Button
          label="联系客服"
          variant="outline"
          fullWidth
          onPress={() => router.push('/service')}
          testID="aftersales-cs"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function InfoRow({
  label,
  value,
  subColor,
  textColor,
}: {
  label: string;
  value: string;
  subColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  statusBox: { gap: spacing.xs },
  statusText: { ...typography.h3, fontWeight: '700' },
  statusDesc: { ...typography['body-sm'] },
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography['body-sm'] },
  infoValue: { ...typography['body-sm'], fontWeight: '500' },
});
