// ⚠️ 无 HTML 原型，参考 CheckoutPage 推导实现，待设计确认
// AfterSalesApplyPage — 售后申请（参考 CheckoutPage.html 的地址卡片 + 商品卡片样式）
// D.5: PrimaryHeader + 商品卡片 + 类型 Chip + 原因 Chip + 描述 + 照片凭证 + 联系方式 + 提交
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
import { afterSalesApplySchema, type AfterSalesApplyValues } from '@/forms/schemas/service';

const REFUND_REASON_KEYS = [
  'afterSales.reasons.damaged',
  'afterSales.reasons.notAsDescribed',
  'afterSales.reasons.quality',
  'afterSales.reasons.wrongOrMissing',
  'afterSales.reasons.noReason',
];

const REFUND_TYPES = [
  { id: 'refund-only', labelKey: 'afterSales.types.refundOnly', icon: 'payments' },
  { id: 'return-refund', labelKey: 'afterSales.types.returnRefund', icon: 'local_shipping' },
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
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <PrimaryHeader
        title={t('afterSales.applyTitle')}
        showBack
        onBackPress={() => router.back()}
      />

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
          <View style={styles.cardHeader}>
            <Icon symbol="shopping_cart" size={16} color={colors.primary} />
            <Text style={[styles.cardHeaderText, { color: colors.primary }]}>
              {t('afterSales.productLabel', { defaultValue: 'Product' })}
            </Text>
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
                {t('afterSales.mockProduct')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × 1
                </Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>$25.90</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 申请类型卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('afterSales.typeLabel')}
          </Text>
          <View style={styles.typesRow}>
            {REFUND_TYPES.map((rt) => {
              const active = typeValue === rt.id;
              return (
                <Pressable
                  key={rt.id}
                  onPress={() => setValue('type', rt.id)}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: active ? colors.primary : colors['surface-container-low'],
                      borderColor: active ? colors.primary : colors['outline-variant'],
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(rt.labelKey)}
                  testID={`type-${rt.id}`}
                >
                  <Icon
                    symbol={rt.icon}
                    size={20}
                    color={active ? '#ffffff' : colors['on-surface-variant']}
                  />
                  <Text
                    style={[styles.typeLabel, { color: active ? '#ffffff' : colors['on-surface'] }]}
                  >
                    {t(rt.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 退款原因卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
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
        </View>

        {/* 描述卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
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
                      borderColor: error ? colors.error : colors['outline-variant'],
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

          {/* 凭证照片占位 */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('afterSales.evidenceLabel', { defaultValue: 'Upload evidence (optional)' })}
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
              accessibilityLabel="Add evidence photo"
              testID="aftersales-add-photo"
            >
              <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
              <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                {t('afterSales.addPhoto', { defaultValue: 'Add' })}
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
              {t('afterSales.contactLabel', { defaultValue: 'Contact' })}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Icon symbol="call" size={18} color={colors['on-surface-variant']} />
            <Text style={[styles.contactValue, { color: colors['on-surface'] }]}>
              +670 7700 0000
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
        <View style={styles.refundAmountBox}>
          <Text style={[styles.refundLabel, { color: colors['on-surface-variant'] }]}>
            {t('afterSales.refundAmount', { defaultValue: 'Refund amount' })}
          </Text>
          <Text style={[styles.refundValue, { color: colors.primary }]}>$25.90</Text>
        </View>
        <Pressable
          onPress={submit}
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('afterSales.applySubmit')}
          testID="aftersales-submit"
        >
          <Text style={styles.submitText}>{t('afterSales.applySubmit')}</Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: 140,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    zIndex: 2,
  },
  cardHeaderText: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 11,
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
  typesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeLabel: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  contactValue: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  refundAmountBox: {
    gap: 2,
  },
  refundLabel: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  refundValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1,
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
