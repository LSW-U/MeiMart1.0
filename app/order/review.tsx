import { useState } from 'react';
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
import { reviewSchema, type ReviewValues } from '@/forms/schemas/service';

const TAGS = [
  'review.tag.quality',
  'review.tag.fastDelivery',
  'review.tag.goodPackaging',
  'review.tag.goodValue',
  'review.tag.fresh',
  'review.tag.repurchase',
];
const RATING_KEYS = [
  'review.rating.terrible',
  'review.rating.bad',
  'review.rating.okay',
  'review.rating.good',
  'review.rating.great',
];

export default function OrderReviewPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { control, handleSubmit } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, content: '' },
    mode: 'onBlur',
  });
  const ratingValue = useWatch({ control, name: 'rating' }) as number;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((tk) => tk !== tag) : [...prev, tag],
    );
  };

  const submit = handleSubmit(() => {
    Alert.alert(t('review.successTitle'), t('review.successDesc'), [
      { text: t('common.ok'), onPress: () => router.back() },
    ]);
  });

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('review.title')} showBack onBackPress={() => router.back()} />
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
                {t('review.mockProductName')}
              </Text>
              <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>x 2</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('review.productRating')}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Controller
                key={n}
                control={control}
                name="rating"
                render={({ field: { onChange } }) => (
                  <Button
                    label="★"
                    variant="text"
                    onPress={() => onChange(n)}
                    testID={`star-${n}`}
                  />
                )}
              />
            ))}
            <Text style={[styles.ratingLabel, { color: colors.primary }]}>
              {t(RATING_KEYS[ratingValue - 1])}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('review.contentLabel')}
          </Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <>
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  placeholder={t('review.placeholder')}
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
                  testID="review-content"
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
          <View style={styles.tagsRow}>
            {TAGS.map((tagKey) => {
              const active = selectedTags.includes(tagKey);
              return (
                <Chip
                  key={tagKey}
                  label={t(tagKey)}
                  selected={active}
                  onSelect={() => toggleTag(tagKey)}
                />
              );
            })}
          </View>
        </Card>

        <Button
          label={t('review.submit')}
          variant="primary"
          fullWidth
          onPress={submit}
          testID="review-submit"
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
  label: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingLabel: { ...typography['body-sm'], marginLeft: spacing.sm },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: 8,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
    ...typography['body-md'],
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  errorText: {
    ...typography['body-sm'],
    marginBottom: spacing.xs,
  },
});
