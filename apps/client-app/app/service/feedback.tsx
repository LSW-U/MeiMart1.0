// FeedbackPage — 反馈表单（P22 优化）
// 原型：第四梯队HTML原型设计/P22-反馈页-优化原型.html
// D1 四块独立卡片 → 一体化 form-card（field-divider 分隔 + 内联 field-label）
// D2 类型扁平 chip → 3×2 图标网格；D6 输入 focus 态；D7 计数器阈值变色；D9 硬编码白色 → on-primary token
import { StyleSheet, View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useState } from 'react';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import { feedbackSchema, type FeedbackValues } from '@/forms/schemas/service';

const FEEDBACK_TYPE_KEYS = [
  'service.feedback.types.feature',
  'service.feedback.types.product',
  'service.feedback.types.order',
  'service.feedback.types.payment',
  'service.feedback.types.shipping',
  'service.feedback.types.other',
];

// D2：类型网格 icon（iconMapping 已存在 receipt_long/credit_card/local_shipping/more_horiz，
// lightbulb/inventory_2 为本页新增映射）
const FEEDBACK_TYPE_ICONS: Record<string, string> = {
  'service.feedback.types.feature': 'lightbulb',
  'service.feedback.types.product': 'inventory_2',
  'service.feedback.types.order': 'receipt_long',
  'service.feedback.types.payment': 'credit_card',
  'service.feedback.types.shipping': 'local_shipping',
  'service.feedback.types.other': 'more_horiz',
};

export default function FeedbackPage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  // D6：输入框 focus 态（RN 无 :focus 伪类，手动跟踪）
  const [contentFocused, setContentFocused] = useState(false);
  const [contactFocused, setContactFocused] = useState(false);

  const { control, handleSubmit, setValue } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { category: '', content: '', contact: '' },
    mode: 'onBlur',
  });
  const contentValue = useWatch({ control, name: 'content' }) as string;
  const categoryValue = useWatch({ control, name: 'category' }) as string;

  const submit = handleSubmit(() => {
    toast.success(t('service.feedback.submitted'));
    handleBack();
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
        onBackPress={handleBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* D1 一体化表单容器 */}
        <View
          style={[
            styles.formCard,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          {/* 反馈类型（D2 3×2 图标网格） */}
          <View>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors['on-surface'] }]}>
                {t('service.feedback.type')}
              </Text>
              <Text style={[styles.requiredMark, { color: colors.error }]}>*</Text>
            </View>
            <View style={styles.typeGrid}>
              {FEEDBACK_TYPE_KEYS.map((key) => {
                const selected = categoryValue === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setValue('category', selected ? '' : key)}
                    style={({ pressed }) => [
                      styles.typeCell,
                      {
                        borderColor: selected ? colors.primary : colors['outline-variant'],
                        backgroundColor: selected
                          ? colors['surface-container-low']
                          : colors['surface-container-lowest'],
                      },
                      pressed && { transform: [{ scale: 0.95 }] },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={t(key)}
                    testID={`feedback-type-${key.split('.').pop()}`}
                  >
                    <View
                      style={[
                        styles.typeIconWrap,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : colors['surface-container'],
                        },
                      ]}
                    >
                      <Icon
                        symbol={FEEDBACK_TYPE_ICONS[key]}
                        size={20}
                        color={selected ? colors['on-primary'] : colors['on-surface-variant']}
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: selected ? colors.primary : colors['on-surface-variant'] },
                      ]}
                    >
                      {t(key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors['outline-variant'] }]} />

          {/* 反馈内容（D6 focus 态 + D7 计数器阈值变色） */}
          <View>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors['on-surface'] }]}>
                {t('service.feedback.content')}
              </Text>
              <Text style={[styles.requiredMark, { color: colors.error }]}>*</Text>
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
                    onFocus={() => setContentFocused(true)}
                    onBlur={() => setContentFocused(false)}
                    style={[
                      styles.textarea,
                      {
                        color: colors['on-surface'],
                        borderColor: error
                          ? colors.error
                          : contentFocused
                            ? colors.primary
                            : colors['outline-variant'],
                        backgroundColor:
                          error || contentFocused
                            ? colors['surface-container-lowest']
                            : colors['surface-container-low'],
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
            <Text
              style={[
                styles.counter,
                {
                  color:
                    contentValue.length === 500
                      ? colors.error
                      : contentValue.length >= 450
                        ? colors.semantic.warning
                        : colors['on-surface-variant'],
                  fontWeight: contentValue.length >= 450 ? '700' : '400',
                },
              ]}
            >
              {contentValue.length} / 500
            </Text>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors['outline-variant'] }]} />

          {/* 照片（D3 真实化见后续：暂保留添加占位） */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors['on-surface'], marginBottom: spacing.sm }]}>
              {t('service.feedback.photosLabel')}
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
                accessibilityLabel={t('service.feedback.a11y.addScreenshot')}
                testID="feedback-add-photo"
              >
                <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
                <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                  {t('service.feedback.addPhoto')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.fieldDivider, { backgroundColor: colors['outline-variant'] }]} />

          {/* 联系方式（D6 focus 态） */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors['on-surface'], marginBottom: spacing.sm }]}>
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
                  onFocus={() => setContactFocused(true)}
                  onBlur={() => setContactFocused(false)}
                  style={[
                    styles.input,
                    {
                      color: colors['on-surface'],
                      borderColor: contactFocused
                        ? colors.primary
                        : colors['outline-variant'],
                      backgroundColor: contactFocused
                        ? colors['surface-container-lowest']
                        : colors['surface-container-low'],
                    },
                  ]}
                  testID="feedback-contact"
                />
              )}
            />
            <Text style={[styles.optionalHint, { color: colors['on-surface-variant'] }]}>
              {t('service.feedback.optionalHint')}
            </Text>
          </View>
        </View>

        {/* 提示信息卡片（TaisPattern 装饰） */}
        <View style={[styles.tipCard, { backgroundColor: colors['surface-container-low'] }]}>
          <View style={styles.tipPattern} pointerEvents="none">
            <TaisPattern width={400} height={80} opacity={0.18} />
          </View>
          <View style={[styles.tipIconWrap, { backgroundColor: colors.primary }]}>
            <Icon symbol="info" size={18} color={colors['on-primary']} />
          </View>
          <View style={styles.tipTextBox}>
            <Text style={[styles.tipTitle, { color: colors['on-surface'] }]}>
              {t('service.feedback.tipTitle')}
            </Text>
            <Text style={[styles.tipDesc, { color: colors['on-surface-variant'] }]}>
              {t('service.feedback.tipDesc')}
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
          <Icon symbol="send" size={18} color={colors['on-primary']} />
          <Text style={[styles.submitText, { color: colors['on-primary'] }]}>
            {t('service.feedback.submit')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: 120,
    gap: spacing.md,
  },
  // D1 一体化表单容器（替代原 4 块独立 card）
  formCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography['body-md'],
    fontSize: 13,
    fontWeight: '700',
  },
  requiredMark: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  // D2 类型网格（3×2，flexWrap 模拟 CSS Grid）
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeCell: {
    width: '31%',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 5,
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
  },
  textarea: {
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlignVertical: 'top',
    ...typography['body-md'],
  },
  counter: {
    ...typography['label-caps'],
    textAlign: 'right',
    marginTop: spacing.xs,
    fontSize: 11,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    ...typography['body-md'],
  },
  optionalHint: {
    ...typography['label-caps'],
    fontSize: 11,
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
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
});
