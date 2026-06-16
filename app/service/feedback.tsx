import { StyleSheet, View, Text, TextInput, ScrollView, Alert } from 'react-native';
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
import { feedbackSchema, type FeedbackValues } from '@/forms/schemas/service';

const FEEDBACK_TYPE_KEYS = [
  'service.feedback.types.feature',
  'service.feedback.types.product',
  'service.feedback.types.order',
  'service.feedback.types.payment',
  'service.feedback.types.shipping',
  'service.feedback.types.other',
];

export default function FeedbackPage() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { control, handleSubmit, setValue } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { category: '', content: '', contact: '' },
    mode: 'onBlur',
  });
  const contentValue = useWatch({ control, name: 'content' }) as string;
  const categoryValue = useWatch({ control, name: 'category' }) as string;

  const submit = handleSubmit(() => {
    Alert.alert(t('common.submitted'), t('service.feedback.submitted'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  });

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('service.feedback.title')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.type')}
          </Text>
          <View style={styles.tagsRow}>
            {FEEDBACK_TYPE_KEYS.map((key) => (
              <Chip
                key={key}
                label={t(key)}
                selected={categoryValue === key}
                onSelect={() => setValue('category', categoryValue === key ? '' : key)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.content')}
          </Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('service.feedback.placeholder')}
                  placeholderTextColor={colors['on-surface-variant']}
                  multiline
                  numberOfLines={6}
                  maxLength={500}
                  style={[
                    styles.textarea,
                    {
                      color: colors['on-surface'],
                      backgroundColor: colors['surface-container-low'],
                    },
                  ]}
                  testID="feedback-content"
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
          <Text style={[styles.counter, { color: colors['on-surface-variant'] }]}>
            {contentValue.length} / 500
          </Text>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('service.feedback.contact')}
          </Text>
          <Controller
            control={control}
            name="contact"
            render={({ field: { value, onChange } }) => (
              <TextInput
                value={value ?? ''}
                onChangeText={onChange}
                placeholder={t('service.feedback.contactPlaceholder')}
                placeholderTextColor={colors['on-surface-variant']}
                style={[
                  styles.input,
                  {
                    color: colors['on-surface'],
                    backgroundColor: colors['surface-container-low'],
                  },
                ]}
                testID="feedback-contact"
              />
            )}
          />
        </Card>

        <Button
          label={t('service.feedback.submit')}
          variant="primary"
          fullWidth
          onPress={submit}
          testID="feedback-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  textarea: {
    minHeight: 120,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    ...typography['body-md'],
  },
  counter: {
    ...typography['label-caps'],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  input: {
    padding: spacing.md,
    borderRadius: 8,
    ...typography['body-md'],
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
});
