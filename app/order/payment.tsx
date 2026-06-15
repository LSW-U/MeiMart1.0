import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const METHODS = [
  {
    id: 'wechat',
    labelKey: 'checkout.payment.wechat',
    icon: 'wechat' as const,
    hintKey: 'payment.recommended',
  },
  { id: 'alipay', labelKey: 'checkout.payment.alipay', icon: 'alpha-c' as const },
  { id: 'cash', labelKey: 'checkout.payment.cash', icon: 'cash' as const },
];

export default function PaymentPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const pay = () => {
    router.push('/order/result');
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('payment.title')} showBack onBackPress={() => router.back()} />
      <View style={styles.amountBox}>
        <Text style={[styles.amountLabel, { color: colors['on-surface-variant'] }]}>
          {t('payment.amountDue')}
        </Text>
        <PriceText value={94.7} size="lg" />
      </View>
      <View style={styles.list}>
        <Card>
          {METHODS.map((m, idx) => (
            <Pressable
              key={m.id}
              testID={`pay-method-${m.id}`}
              style={({ pressed }) => [
                styles.methodRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors['outline-variant'],
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(m.labelKey)}
            >
              <MaterialCommunityIcons name={m.icon} size={24} color={colors.primary} />
              <View style={styles.methodBody}>
                <Text style={[styles.methodLabel, { color: colors['on-surface'] }]}>
                  {t(m.labelKey)}
                </Text>
                {m.hintKey && (
                  <Text style={[styles.methodHint, { color: colors.primary }]}>{t(m.hintKey)}</Text>
                )}
              </View>
              <MaterialCommunityIcons name="radiobox-marked" size={20} color={colors.primary} />
            </Pressable>
          ))}
        </Card>
      </View>
      <View style={styles.bottomBar}>
        <Button
          label={t('payment.payNow')}
          variant="primary"
          fullWidth
          onPress={pay}
          testID="pay-now"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  amountBox: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.xs },
  amountLabel: { ...typography['label-caps'] },
  list: { padding: spacing.md, gap: spacing.md },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  methodBody: { flex: 1, gap: 2 },
  methodLabel: { ...typography['body-md'], fontWeight: '500' },
  methodHint: { ...typography['label-caps'] },
  bottomBar: { padding: spacing.lg },
});
