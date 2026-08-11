// HTML 原型：第三梯队HTML原型设计/P13-售后申请页-优化原型.html（2026-08-07 出）
// AfterSalesApplyPage - 售后申请页
// 结构：商品卡片 + 申请类型 + 退款原因 + 问题描述 + 凭证照片 + 底部提交栏
//
// TODO(长期):
// 1. 凭证照片上传接 OSS / 本地文件上传（B2 待后端）
// 注：决策 7 已删电话字段（联系方式独立卡片砍掉，不接 useUser —— 售后页放用户自己电话语义错）
// 注：POST /client/refunds 已就绪（reason 8 值 + items[] 部分退款），Commit 7 接 useCreateRefund
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useNetwork } from '@/hooks/useNetwork';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { PriceText } from '@/components/ui/PriceText';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { ErrorState } from '@/components/feedback/ErrorState';
import { toast } from '@/store/toastStore';
import { useOrder } from '@/services/queries/useOrders';
import { useCreateRefund } from '@/services/queries/useRefunds';
import { uploadsApi } from '@/services/uploads';
import { REASON_KEY_TO_ENUM } from '@/services/refunds';
import { useLocalizer } from '@/i18n';
import { afterSalesApplySchema, type AfterSalesApplyValues } from '@/forms/schemas/service';

// Why: styles 在模块级无法访问 useTheme 的 colors，per-file const 模式（同 P10/P11/P12 跨梯队 E6）
const ON_PRIMARY = '#ffffff';

const REFUND_REASON_KEYS = [
  'afterSales.reasons.expired',
  'afterSales.reasons.damaged',
  'afterSales.reasons.wrongItem',
  'afterSales.reasons.shortage',
  'afterSales.reasons.quality',
];

const REFUND_TYPES = [
  { id: 'refund-only', labelKey: 'afterSales.types.refundOnly', descKey: 'afterSales.types.refundOnlyDesc', icon: 'payments' },
  { id: 'return-refund', labelKey: 'afterSales.types.returnRefund', descKey: 'afterSales.types.returnRefundDesc', icon: 'local_shipping' },
] as const;

// F5 多商品选择 state（每商品 selected + refundQty，order 加载后初始化全选全数量）
interface ItemState {
  orderItemId: string;
  refundQty: number;
  selected: boolean;
}

export default function AfterSalesApplyPage() {
  const handleBack = useSafeBack();
  const { t } = useTranslation();
  const { isOffline } = useNetwork();
  const { colors } = useTheme();
  const localize = useLocalizer();
  // Why: 短期入参 = orderId（由 order/[id].tsx 跳来时传入），长期改为 afterSalesId
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);

  const { control, handleSubmit, setValue } = useForm<AfterSalesApplyValues>({
    resolver: zodResolver(afterSalesApplySchema),
    defaultValues: { type: 'refund-only', reason: '', description: '' },
    // F3：onBlur -> onChange（typeCard/reason 点击后即时校验反馈）
    mode: 'onChange',
  });
  const typeValue = useWatch({ control, name: 'type' }) as AfterSalesApplyValues['type'];
  const reasonValue = useWatch({ control, name: 'reason' }) as string;
  const createRefund = useCreateRefund();

  // F5 多商品：itemStates 管理每商品勾选 + 退款数量，order 加载后初始化全选全数量
  const [itemStates, setItemStates] = useState<ItemState[]>([]);
  // P13 B2 售后凭证照片：URL 数组（upload 端点返回），最多 3 张；uploading 控制按钮 disable + loading
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!order) return;
    // 原因：order 是 react-query 缓存（引用稳定），加载完成时初始化 items 全选全数量；非 derived（用户可改勾选/数量）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItemStates(
      order.items.map((it) => ({
        orderItemId: it.id,
        refundQty: it.quantity,
        selected: true,
      })),
    );
  }, [order]);
  const refundAmount = useMemo(
    () =>
      itemStates.reduce((sum, st) => {
        if (!st.selected) return sum;
        const it = order?.items.find((oi) => oi.id === st.orderItemId);
        return sum + (it ? it.product.price * st.refundQty : 0);
      }, 0),
    [itemStates, order],
  );
  const updateItemState = (idx: number, patch: Partial<ItemState>) =>
    setItemStates((prev) => prev.map((st, i) => (i === idx ? { ...st, ...patch } : st)));

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

  // P13 B2 选图 + 上传：expo-image-picker → uploadsApi.refundEvidence → push URL（最多 3 张）
  const handleAddPhoto = async () => {
    if (photos.length >= 3) {
      toast.info(t('afterSales.photoLimitReached', { defaultValue: 'Up to 3 photos' }));
      return;
    }
    if (uploading) return; // 防重复点
    // Q3 弱网离线前置检测（规则12：凭证照片上传属关键操作，离线时阻止并明确提示，不静默失败）
    if (isOffline) {
      toast.error(t('common.youAreOffline'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // 售后凭证不裁剪，保留原始任意比例（后端最小 100×100 无上限无 1:1）
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const uploaded = await uploadsApi.refundEvidence(asset.uri, asset.mimeType ?? 'image/jpeg');
      setPhotos((prev) => [...prev, uploaded.url]);
    } catch (err) {
      // 原因：后端 E-UPLOAD-001/002（magic bytes/尺寸/MinIO 故障），message 英文够用
      toast.error(
        err instanceof Error
          ? err.message
          : t('afterSales.uploadFailed', { defaultValue: 'Upload failed' }),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Commit 7+8：接真实 POST /client/refunds（Commit 7 整单 / Commit 8 部分退款 items[]）
  // reason i18n key -> enum 映射（service 层 REASON_KEY_TO_ENUM）；onSuccess 跳 detail 传 refund.id
  const submit = handleSubmit(async (values) => {
    const selected = itemStates.filter((st) => st.selected);
    if (selected.length === 0) {
      toast.error(t('afterSales.selectItemPrompt', { defaultValue: 'Please select at least one item' }));
      return;
    }
    const reason = REASON_KEY_TO_ENUM[values.reason] ?? 'OTHER';
    try {
      const refund = await createRefund.mutateAsync({
        orderId,
        reason,
        reasonDetail: values.description,
        // F5 部分退款：items[] 用 orderItemId（OrderItem.id 非 skuId，transformOrderItem 已映射 raw.id）
        items: selected.map(({ orderItemId, refundQty }) => ({ orderItemId, refundQty })),
        // P13 B2 凭证照片 URL 数组（空时不传，向后兼容；后端 isOwnUrl 校验 + max 9）
        photos: photos.length > 0 ? photos : undefined,
      });
      toast.success(t('afterSales.submittedDesc'));
      router.replace({
        pathname: '/order/after-sales-detail',
        params: { id: refund.id },
      });
    } catch (err) {
      // 后端 E-REFUND-001（order 状态不允许）/ E-REFUND-002（重复退款）等，message 英文够用
      toast.error(err instanceof Error ? err.message : t('errors.generic'));
    }
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* 商品卡片 - F5 多商品选择（保留纹样主卡） */}
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
            {order.items.map((it, idx) => {
              const state = itemStates[idx];
              const selected = state?.selected ?? true;
              const refundQty = state?.refundQty ?? it.quantity;
              return (
                <View
                  key={it.id}
                  style={[
                    styles.itemRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors['outline-variant'],
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => updateItemState(idx, { selected: !selected })}
                    style={[
                      styles.checkBox,
                      {
                        backgroundColor: selected ? colors.primary : 'transparent',
                        borderColor: selected ? colors.primary : colors.outline,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${t('afterSales.productLabel', { defaultValue: 'Product' })}: ${localize(it.product.name)}`}
                    testID={`item-check-${it.id}`}
                  >
                    {selected ? <Icon symbol="check" size={15} color={ON_PRIMARY} /> : null}
                  </Pressable>
                  <View style={[styles.itemThumb, { backgroundColor: colors['surface-container'] }]}>
                    {it.product.image ? (
                      <Image
                        source={{ uri: it.product.image }}
                        style={styles.productImg}
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>
                  <View style={styles.itemText}>
                    <Text style={[styles.itemName, { color: colors['on-surface'] }]} numberOfLines={2}>
                      {localize(it.product.name)}
                    </Text>
                    <PriceText value={it.product.price} size="sm" />
                  </View>
                  <View style={[styles.qtyStepper, { borderColor: colors['outline-variant'] }]}>
                    <Pressable
                      onPress={() => updateItemState(idx, { refundQty: Math.max(1, refundQty - 1) })}
                      style={styles.qtyBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('afterSales.decreaseQty', { defaultValue: 'Decrease quantity' })}
                    >
                      <Text style={[styles.qtyBtnText, { color: colors['on-surface-variant'] }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.qtyVal, { color: colors['on-surface'] }]}>{refundQty}</Text>
                    <Pressable
                      onPress={() => updateItemState(idx, { refundQty: Math.min(it.quantity, refundQty + 1) })}
                      style={styles.qtyBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('afterSales.increaseQty', { defaultValue: 'Increase quantity' })}
                    >
                      <Text style={[styles.qtyBtnText, { color: colors['on-surface-variant'] }]}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
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
                        backgroundColor: active ? colors['surface-container-high'] : colors['surface-container-low'],
                        borderColor: active ? colors.primary : colors['outline-variant'],
                        borderWidth: active ? 2 : StyleSheet.hairlineWidth,
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(rt.labelKey)}
                    testID={`type-${rt.id}`}
                  >
                    <View
                      style={[
                        styles.typeIconBox,
                        { backgroundColor: active ? colors.primary : colors['surface-container'] },
                      ]}
                    >
                      <Icon
                        symbol={rt.icon}
                        size={20}
                        color={active ? colors['on-primary'] : colors['on-surface-variant']}
                      />
                    </View>
                    <View style={styles.typeBody}>
                      <Text style={[styles.typeName, { color: colors['on-surface'] }]}>
                        {t(rt.labelKey)}
                      </Text>
                      <Text style={[styles.typeDesc, { color: colors['on-surface-variant'] }]}>
                        {t(rt.descKey)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 退款原因卡片（RC1：Chip 横排 → 纵向 radio 列表） */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
            ]}
          >
            <Text style={[styles.label, { color: colors['on-surface'] }]}>
              {t('afterSales.reasonLabel')}
            </Text>
            <View style={styles.reasonList}>
              {REFUND_REASON_KEYS.map((key, idx) => {
                const active = reasonValue === key;
                const isLast = idx === REFUND_REASON_KEYS.length - 1;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setValue('reason', key)}
                    style={[
                      styles.reasonItem,
                      { borderBottomColor: colors['outline-variant'] },
                      isLast && { borderBottomWidth: 0 },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t(key)}
                    testID={`reason-${key}`}
                  >
                    <View
                      style={[
                        styles.radio,
                        { borderColor: active ? colors.primary : colors.outline },
                      ]}
                    >
                      {active ? (
                        <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.reasonText,
                        {
                          color: active ? colors.primary : colors['on-surface'],
                          fontWeight: active ? '600' : '400',
                        },
                      ]}
                    >
                      {t(key)}
                    </Text>
                  </Pressable>
                );
              })}
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
                  <Text style={[styles.counter, { color: colors['on-surface-variant'] }]}>
                    {`${(value ?? '').length} / 500`}
                  </Text>
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
                onPress={handleAddPhoto}
                style={[
                  styles.photoAddBtn,
                  {
                    backgroundColor: colors['surface-container-low'],
                    borderColor: colors['outline-variant'],
                    opacity: uploading || photos.length >= 3 ? 0.5 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('afterSales.addPhotoA11y', { defaultValue: 'Add evidence photo' })}
                accessibilityState={{ disabled: uploading || photos.length >= 3 }}
                testID="aftersales-add-photo"
                disabled={uploading || photos.length >= 3}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={colors['on-surface-variant']} />
                ) : (
                  <>
                    <Icon symbol="photo_camera" size={22} color={colors['on-surface-variant']} />
                    <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                      {t('afterSales.addPhoto', { defaultValue: 'Add' })}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* P13 B2 已选照片缩略图 + 删除按钮 */}
              {photos.map((url, index) => (
                <View key={url} style={[styles.photoThumb, { backgroundColor: colors['surface-container'] }]}>
                  <Image source={{ uri: url }} style={styles.photoThumbImg} resizeMode="cover" />
                  <Pressable
                    onPress={() => handleDeletePhoto(index)}
                    style={[styles.photoDeleteBtn, { backgroundColor: colors['error-container'] }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('afterSales.deletePhotoA11y', { defaultValue: 'Delete photo' })}
                    testID={`aftersales-delete-photo-${index}`}
                  >
                    <Icon symbol="close" size={14} color={colors['on-primary']} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={[styles.photoHint, { color: colors['on-surface-variant'] }]}>
              {t('afterSales.evidenceLimit', { defaultValue: 'Up to 3 photos, JPG / PNG' })}
            </Text>
          </View>

        </ScrollView>

        {/* 底部提交按钮栏（R1 加退款说明行；D1 删联系卡） */}
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
          <View style={styles.bottomRow}>
            <View style={styles.refundAmountBox}>
              <Text style={[styles.refundLabel, { color: colors['on-surface-variant'] }]}>
                {t('afterSales.refundAmount', { defaultValue: 'Refund amount' })}
              </Text>
              <PriceText value={refundAmount} size="lg" />
            </View>
            <Pressable
              onPress={submit}
              disabled={createRefund.isPending}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary },
                pressed && { transform: [{ scale: 0.98 }] },
                createRefund.isPending && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: createRefund.isPending }}
              accessibilityLabel={t('afterSales.applySubmit')}
              testID="aftersales-submit"
            >
              <Text style={styles.submitText}>{t('afterSales.applySubmit')}</Text>
            </Pressable>
          </View>
          <View style={styles.refundNoteRow}>
            <Icon symbol="info" size={13} color={colors['on-surface-variant']} />
            <Text style={[styles.refundNoteText, { color: colors['on-surface-variant'] }]}>
              {t('afterSales.refundNote')}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    // 删 paddingBottom: 140（KeyboardAvoidingView 改造：底部栏 normal flow 不遮挡 ScrollView 内容）
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
  // F5 多商品列表项（替换旧单商品 product 系列，productImg 保留复用）
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  itemText: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  qtyVal: {
    minWidth: 28,
    textAlign: 'center',
    ...typography['body-sm'],
    fontWeight: '600',
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
    // F1 横排改纵向（激活态视觉太重 + 无说明文案）
    flexDirection: 'column',
    gap: spacing.sm,
  },
  typeCard: {
    // F1 横排实底 → 纵向列表（icon 盒 + 标题 + 描述），激活态 primary 描边 + 浅底（对齐 HTML opt-type）
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBody: {
    flex: 1,
  },
  typeName: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  typeDesc: {
    ...typography['body-sm'],
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  reasonList: {
    // RC1 Chip 横排 → 纵向 radio 列表（对齐 HTML opt-reason）
    flexDirection: 'column',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    flex: 1,
    ...typography['body-md'],
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
  // P13 B2 缩略图：72×72 圆角 + 删除按钮右上角悬浮
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    // F4 照片上传提示
    ...typography['body-sm'],
    fontSize: 11,
    marginTop: spacing.sm,
  },
  counter: {
    // F2 描述框字数统计
    ...typography['body-sm'],
    fontSize: 11,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  bottomBar: {
    // KeyboardAvoidingView 改造：去 position absolute，底部栏 normal flow（ScrollView 之后，KeyboardAvoidingView 内）
    flexDirection: 'column',
    padding: spacing.md,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  refundAmountBox: {
    gap: 2,
  },
  refundNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refundNoteText: {
    ...typography['body-sm'],
    fontSize: 11,
    flex: 1,
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
