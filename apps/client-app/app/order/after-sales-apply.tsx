// HTML 原型：第三梯队HTML原型设计/P13-售后申请页-优化原型.html（2026-08-07 出）
// AfterSalesApplyPage - 售后申请页
// 结构：商品卡片 + 申请类型 + 退款原因 + 问题描述 + 凭证照片 + 底部提交栏
//
// TODO(长期):
// 1. 凭证照片上传接 OSS / 本地文件上传（B2 待后端）
// 注：决策 7 已删电话字段（联系方式独立卡片砍掉，不接 useUser —— 售后页放用户自己电话语义错）
// 注：POST /client/refunds 已就绪（reason 8 值 + items[] 部分退款），Commit 7 接 useCreateRefund
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Chip } from '@/components/ui/Chip';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { PriceText } from '@/components/ui/PriceText';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { toast } from '@/store/toastStore';
import { useOrder } from '@/services/queries/useOrders';
import { useLocalizer } from '@/i18n';
import { afterSalesApplySchema, type AfterSalesApplyValues } from '@/forms/schemas/service';

// Why: styles 在模块级无法访问 useTheme 的 colors，per-file const 模式（同 P10/P11/P12 跨梯队 E6）
const ON_PRIMARY = '#ffffff';

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
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const localize = useLocalizer();
  // Why: 短期入参 = orderId（由 order/[id].tsx 跳来时传入），长期改为 afterSalesId
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);

  const { control, handleSubmit, setValue } = useForm<AfterSalesApplyValues>({
    resolver: zodResolver(afterSalesApplySchema),
    defaultValues: { type: 'refund-only', reason: '', description: '' },
    mode: 'onBlur',
  });
  const typeValue = useWatch({ control, name: 'type' }) as AfterSalesApplyValues['type'];
  const reasonValue = useWatch({ control, name: 'reason' }) as string;

  if (isLoading) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('afterSales.applyTitle')}
          showBack
          onBackPress={handleBack}
        />
        <LoadingOverlay visible />
      </SafeAreaWrapper>
    );
  }

  if (isError || !order) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('afterSales.applyTitle')}
          showBack
          onBackPress={handleBack}
        />
        <ErrorState
          message={t('errors.orderNotFound', { defaultValue: 'Order not found' })}
          onRetry={() => refetch()}
        />
      </SafeAreaWrapper>
    );
  }

  const item = order.items[0];
  const product = item?.product;
  const quantity = item?.quantity ?? 1;
  const refundAmount = order.totalPrice;

  // TODO(长期): 接 useCreateAfterSales mutation（onMutate 乐观更新 + onSuccess 跳 detail）
  const submit = handleSubmit(() => {
    toast.success(t('afterSales.submittedDesc'));
    router.replace({
      pathname: '/order/after-sales-detail',
      params: { id: orderId },
    });
  });

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('afterSales.applyTitle')}
        showBack
        onBackPress={handleBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 商品卡片 - 真实订单商品 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
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
              {product?.image && (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImg}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.productTextBox}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {product ? localize(product.name) : t('afterSales.mockProduct')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × {quantity}
                </Text>
                <PriceText value={product?.price ?? 0} size="md" />
              </View>
            </View>
          </View>
        </View>

        {/* 申请类型卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
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
                    color={active ? colors['on-primary'] : colors['on-surface-variant']}
                  />
                  <Text
                    style={[styles.typeLabel, { color: active ? colors['on-primary'] : colors['on-surface'] }]}
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
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
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
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
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
        </View>

        {/* V2 凭证照片卡片（从描述卡拆出，独立卡片） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
          ]}
        >
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
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
            { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
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

      {/* 底部提交按钮栏 - 真实订单总价 */}
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
          <PriceText value={refundAmount} size="lg" />
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
    padding: layout['container-margin'],
    paddingBottom: 140,
    gap: spacing.md,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    // V1（去 shadow 改 border）：商品主卡保留 TaisPattern 纹样突出，其余卡 border 分区（对齐 HTML 优化栏 opt-card）
    borderWidth: StyleSheet.hairlineWidth,
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
  submitBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
});
