// ⚠️ 无 HTML 原型，参考 CheckoutPage 推导实现，待设计确认
// FeedbackPage — 反馈表单（参考 CheckoutPage.html 的表单样式）
// D.8: PrimaryHeader + 类型 Chip + 内容 textarea + 联系方式 + 照片占位 + 提交按钮
import { StyleSheet, View, Text, TextInput, ScrollView, Alert, Pressable } from 'react-native';
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
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('service.feedback.title')}
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 类型卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="tune" size={16} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('service.feedback.type')}
            </Text>
          </View>
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
        </View>

        {/* 内容卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="edit" size={16} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('service.feedback.content')}
            </Text>
          </View>
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
                      borderColor: error ? colors.error : colors['outline-variant'],
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

          {/* 照片上传占位 */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('service.feedback.photosLabel', { defaultValue: 'Add screenshots (optional)' })}
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
              accessibilityLabel="Add screenshot"
              testID="feedback-add-photo"
            >
              <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
              <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                {t('service.feedback.addPhoto', { defaultValue: 'Add' })}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 联系方式卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardHeader}>
            <Icon symbol="call" size={16} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('service.feedback.contact')}
            </Text>
          </View>
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
                    borderColor: colors['outline-variant'],
                  },
                ]}
                testID="feedback-contact"
              />
            )}
          />
          <Text style={[styles.optionalHint, { color: colors['on-surface-variant'] }]}>
            {t('service.feedback.optionalHint', { defaultValue: 'Optional · We may contact you' })}
          </Text>
        </View>

        {/* 提示信息卡片（TaisPattern 装饰） */}
        <View style={[styles.tipCard, { backgroundColor: colors['surface-container-low'] }]}>
          <View style={styles.tipPattern} pointerEvents="none">
            <TaisPattern width={400} height={80} opacity={0.18} />
          </View>
          <View style={[styles.tipIconWrap, { backgroundColor: colors.primary }]}>
            <Icon symbol="info" size={18} color="#ffffff" />
          </View>
          <View style={styles.tipTextBox}>
            <Text style={[styles.tipTitle, { color: colors['on-surface'] }]}>
              {t('service.feedback.tipTitle', { defaultValue: 'Privacy notice' })}
            </Text>
            <Text style={[styles.tipDesc, { color: colors['on-surface-variant'] }]}>
              {t('service.feedback.tipDesc', {
                defaultValue: 'Your feedback will be handled confidentially',
              })}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部提交按钮栏 */}
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
          accessibilityLabel={t('service.feedback.submit')}
          testID="feedback-submit"
        >
          <Icon symbol="send" size={18} color="#ffffff" />
          <Text style={styles.submitText}>{t('service.feedback.submit')}</Text>
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardHeaderText: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textarea: {
    minHeight: 120,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    ...typography['body-md'],
  },
  counter: {
    ...typography['label-caps'],
    textAlign: 'right',
    marginTop: spacing.xs,
    fontSize: 10,
  },
  subLabel: {
    ...typography['label-caps'],
    fontSize: 11,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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
  input: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...typography['body-md'],
  },
  optionalHint: {
    ...typography['label-caps'],
    fontSize: 10,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography['body-sm'],
    marginTop: spacing.xs,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  tipPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tipTextBox: {
    flex: 1,
    gap: 2,
    zIndex: 2,
  },
  tipTitle: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  tipDesc: {
    ...typography['label-caps'],
    fontSize: 10,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  submitText: {
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
});
