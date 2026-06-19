// ⚠️ 无 HTML 原型，参考 ProductDetailPage 推导实现，待设计确认
// OrderReviewPage — 订单评价（参考 ProductDetailPage.html 的商品卡片 + 星级样式）
// D.4: PrimaryHeader + 商品卡片 + 5 星 emoji 评分 + 标签 Chip + 评价文本 + 照片占位 + 提交按钮
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Chip } from '@/components/ui/Chip';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
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

const RATING_EMOJI = ['😞', '😕', '😐', '🙂', '😍'];

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
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('review.title')} showBack onBackPress={() => router.back()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 商品卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardPattern} pointerEvents="none">
            <TaisPattern width={400} height={60} opacity={0.15} />
          </View>
          <View style={styles.productRow}>
            <View style={[styles.productImgWrap, { backgroundColor: colors['surface-container'] }]}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
                }}
                style={styles.productImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.productTextBox}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {t('review.mockProductName')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × 2
                </Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>$9.80</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 评分卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('review.productRating')}
          </Text>

          <View style={[styles.ratingBox, { backgroundColor: colors['surface-container-low'] }]}>
            <Text style={styles.ratingEmoji}>{RATING_EMOJI[ratingValue - 1]}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Controller
                  key={n}
                  control={control}
                  name="rating"
                  render={({ field: { onChange } }) => (
                    <Pressable
                      onPress={() => onChange(n)}
                      hitSlop={4}
                      testID={`star-${n}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${n} stars`}
                    >
                      <Icon
                        symbol="star_rate"
                        size={32}
                        color={n <= ratingValue ? '#f59e0b' : colors['outline-variant']}
                      />
                    </Pressable>
                  )}
                />
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.primary }]}>
              {t(RATING_KEYS[ratingValue - 1])}
            </Text>
          </View>
        </View>

        {/* 评价内容卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
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
                      borderColor: error ? colors.error : colors['outline-variant'],
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

          {/* 标签 Chip 区 */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('review.tagsLabel', { defaultValue: 'Quick tags' })}
          </Text>
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

          {/* 照片上传占位 */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('review.photosLabel', { defaultValue: 'Add photos (optional)' })}
          </Text>
          <View style={styles.photosRow}>
            <Pressable
              style={[
                styles.photoAddBtn,
                {
                  backgroundColor: colors['surface-container-low'],
                  borderColor: colors['outline-variant'],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
              testID="review-add-photo"
            >
              <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
              <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                {t('review.addPhoto', { defaultValue: 'Add' })}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 匿名评价开关 */}
        <View
          style={[
            styles.anonCard,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.anonTextBox}>
            <Icon symbol="visibility_off" size={18} color={colors['on-surface-variant']} />
            <View>
              <Text style={[styles.anonTitle, { color: colors['on-surface'] }]}>
                {t('review.anonymousTitle', { defaultValue: 'Anonymous review' })}
              </Text>
              <Text style={[styles.anonDesc, { color: colors['on-surface-variant'] }]}>
                {t('review.anonymousDesc', { defaultValue: 'Hide your name publicly' })}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 底部提交按钮 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        <Pressable
          onPress={submit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('review.submit')}
          testID="review-submit"
        >
          <Text style={styles.submitText}>{t('review.submit')}</Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: 120,
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    zIndex: 2,
  },
  productImgWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productTextBox: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography['body-md'],
    fontWeight: '600',
    lineHeight: 18,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productMeta: {
    ...typography['body-sm'],
  },
  productPrice: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  label: {
    ...typography['body-md'],
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subLabel: {
    ...typography['label-caps'],
    fontSize: 11,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  ratingBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ratingEmoji: {
    fontSize: 40,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingLabel: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
  },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    ...typography['body-md'],
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoAddBtn: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  anonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  anonTextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  anonTitle: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  anonDesc: {
    ...typography['label-caps'],
    fontSize: 10,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
});
