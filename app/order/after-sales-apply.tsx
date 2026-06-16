import { StyleSheet, View, Text, TextInput, ScrollView, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { afterSalesApplySchema, type AfterSalesApplyValues } from '@/forms/schemas/service';

const REFUND_REASON_KEYS = [
  'afterSales.reasons.damaged',
  'afterSales.reasons.notAsDescribed',
  'afterSales.reasons.quality',
  'afterSales.reasons.wrongOrMissing',
  'afterSales.reasons.noReason',
];
const REFUND_TYPES = [
  { id: 'refund-only', labelKey: 'afterSales.types.refundOnly' },
  { id: 'return-refund', labelKey: 'afterSales.types.returnRefund' },
] as const;

export default function AfterSalesApplyPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { control, handleSubmit, setValue } = useForm<AfterSalesApplyValues>({
    resolver: zodResolver(afterSalesApplySchema),
    defaultValues: { type: 'refund-only', reason: '', description: '' },
    mode: 'onBlur',
  });
  const typeValue = useWatch({ control, name: 'type' }) as AfterSalesApplyValues['type'];
  const reasonValue = useWatch({ control, name: 'reason' }) as string;

  const submit = handleSubmit(() => {
    Alert.alert(t('afterSales.submittedTitle'), t('afterSales.submittedDesc'), [
      { text: t('common.ok'), onPress: () => router.replace('/order/after-sales-detail') },
    ]);
  });

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('afterSales.applyTitle')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.productRow}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
              }}
              style={styles.productImg}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {t('afterSales.mockProduct')}
              </Text>
              <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>x 1</Text>
            </View>
            <Text style={[styles.productPrice, { color: colors.primary }]}>$25.90</Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.typeLabel')}
          </Text>
          <View style={styles.typesRow}>
            {REFUND_TYPES.map((rt) => {
              const active = typeValue === rt.id;
              return (
                <Chip
                  key={rt.id}
                  label={t(rt.labelKey)}
                  selected={active}
                  onSelect={() => setValue('type', rt.id)}
                />
              );
            })}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.reasonLabel')}
          </Text>
          <View style={styles.tagsRow}>
            {REFUND_REASON_KEYS.map((key) => (
              <Chip
                key={key}
                label={t(key)}
                selected={reasonValue === key}
                onSelect={() => setValue('reason', reasonValue === key ? '' : key)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.descLabel')}
          </Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('afterSales.applyPlaceholder')}
                  placeholderTextColor={colors['on-surface-variant']}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.textarea,
                    {
                      color: colors['on-surface'],
                      backgroundColor: colors['surface-container-low'],
                    },
                  ]}
                  testID="aftersales-content"
                />
                {error?.message && (
                  <Text
                    style={[styles.errorText, { color: colors.error }]}
                    accessibilityRole="alert"
                  >
                    {error.message}
                  </Text>
                )}
              </>
            )}
          />
        </Card>

        <Button
          label={t('afterSales.applySubmit')}
          variant="primary"
          fullWidth
          onPress={submit}
          testID="aftersales-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  productRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  productImg: { width: 60, height: 60, borderRadius: 8 },
  productName: { ...typography['body-sm'], fontWeight: '500' },
  productMeta: { ...typography['label-caps'], marginTop: 4 },
  productPrice: { ...typography['body-md'], fontWeight: '700' },
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  typesRow: { flexDirection: 'row', gap: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    ...typography['body-md'],
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
