import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TimelineStep } from '@/components/business/TimelineStep';
import { PriceText } from '@/components/ui/PriceText';

export default function AfterSalesDetailPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const steps = [
    {
      status: t('afterSales.timeline.submitted'),
      description: t('afterSales.timeline.submittedDesc'),
      timestamp: '2026-06-13 10:00',
    },
    {
      status: t('afterSales.timeline.reviewing'),
      description: t('afterSales.timeline.reviewingDesc'),
      timestamp: '2026-06-13 14:00',
    },
    {
      status: t('afterSales.timeline.approved'),
      description: t('afterSales.timeline.approvedDesc'),
      timestamp: '2026-06-14 09:00',
    },
    {
      status: t('afterSales.timeline.completed'),
      description: t('afterSales.timeline.completedDesc'),
      timestamp: '2026-06-14 11:00',
    },
  ];

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('afterSales.detailTitle')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.statusBox}>
            <Text style={[styles.statusText, { color: colors.primary }]} accessibilityRole="header">
              {t('afterSales.processing')}
            </Text>
            <Text style={[styles.statusDesc, { color: colors['on-surface-variant'] }]}>
              {t('afterSales.processingDesc')}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.refundAmount')}
          </Text>
          <PriceText value={25.9} size="lg" />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.progressLabel')}
          </Text>
          <TimelineStep steps={steps} currentIndex={2} />
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.applyInfo')}
          </Text>
          <InfoRow
            label={t('afterSales.applyNo')}
            value="AS202606130001"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <InfoRow
            label={t('afterSales.reason')}
            value={t('afterSales.mockReason')}
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
          <InfoRow
            label={t('afterSales.applyTime')}
            value="2026-06-13 10:00"
            subColor={colors['on-surface-variant']}
            textColor={colors['on-surface']}
          />
        </Card>

        <Button
          label={t('afterSales.contactService')}
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
