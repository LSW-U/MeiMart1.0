import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { toast } from '@/store/toastStore';
import { productApi } from '@/services/products';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useCart } from '@/services/queries/useCart';
import { useAddresses } from '@/services/queries/useAddress';
import { usePaymentMethods } from '@/services/queries/usePayment';
import { useCreateOrder } from '@/services/queries/useOrders';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { useState } from 'react';

const DISCOUNT = 5.0; // mock 优惠金额（与 cart 页一致）
const DELIVERY_FEE = 0.0; // mock 满 $20 免运费

// 原因：客服 / CONFIRM&PAY 按钮上的固定白字（primary 红底），两种模式不变。
// 不可用 colors['on-primary']：dark 模式翻为 #690005（暗红）叠红底会裂色（同 P2/P3）。
const ON_PRIMARY = '#ffffff';

export default function CheckoutPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: addresses } = useAddresses();
  const { data: paymentMethods } = usePaymentMethods();
  const createOrder = useCreateOrder();
  const selectedItems = cart?.items.filter((i) => i.selected) ?? [];
  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const defaultMethodId = paymentMethods?.find((m) => m.isDefault)?.id ?? paymentMethods?.[0]?.id;
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(defaultMethodId);
  // Why: 防止 submit 期间重复点击（Promise.all 查 SKU 时 createOrder.isPending 还是 false）
  const [submitting, setSubmitting] = useState(false);

  const subtotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const finalTotal = Math.max(0, subtotal - DISCOUNT + DELIVERY_FEE);

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PrimaryHeader title={t('checkout.title')} showBack onBackPress={handleBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PrimaryHeader title={t('checkout.title')} showBack onBackPress={handleBack} />
        <ErrorState message={t('checkout.loadError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const submit = async () => {
    // Why: 防止重复点击（async 期间按钮可能被多次触发）
    if (submitting) return;
    setSubmitting(true);
    try {
      if (isOffline) {
        // Why: Web 端 Alert 不显示，用 toast
        if (Platform.OS === 'web') {
          toast.error(t('checkout.offlineBlockDesc'));
        } else {
          Alert.alert(t('checkout.offlineBlock'), t('checkout.offlineBlockDesc'));
        }
        return;
      }
      if (selectedItems.length === 0) return;
      if (!defaultAddress) {
        toast.error(t('checkout.selectAddress'));
        return;
      }
      // Why: 后端 createOrder 期望 skuId，列表项 product.id 是 Product UUID 不是 SKU ID
      // 需查详情获取 defaultSkuId（与 cartApi.addItem 一致）
      const itemsWithSku = await Promise.all(
        selectedItems.map(async (i) => {
          const skuId =
            i.product.defaultSkuId ?? (await productApi.getProduct(i.product.id))?.defaultSkuId;
          if (!skuId) throw new Error(`No SKU for product ${i.product.id}`);
          return { skuId, quantity: i.quantity };
        }),
      );
      const paymentMethod = (selectedMethod ?? 'COD').toUpperCase();
      const order = await createOrder.mutateAsync({
        items: itemsWithSku,
        payload: {
          addressId: defaultAddress.id,
          paymentMethod,
        },
        totalPrice: finalTotal,
      });
      // Why: 开发环境自动确认订单（COD -> admin 确认；预付 -> 模拟支付+确认），
      // 让骑手端能看到配送任务。prod 走真实流程。
      if (__DEV__) {
        try {
          const { paymentApi } = await import('@/services/payment');
          await paymentApi.devAutoConfirm(order.id, paymentMethod);
        } catch (e) {
          // 确认失败不阻塞下单流程，订单仍已创建
          console.warn('[checkout] devAutoConfirm failed:', e);
        }
      }
      toast.success(t('checkout.orderPlaced', { defaultValue: 'Order placed' }));
      router.replace('/order/result');
    } catch (error: unknown) {
      // Why: 提取后端错误码，用 i18n 翻译
      const err = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
        message?: string;
      };
      const code = err?.response?.data?.error?.code;
      const fallback = err?.response?.data?.error?.message ?? err?.message;
      const translated = code ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
      toast.error(translated ?? t('checkout.orderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PrimaryHeader
        title={t('checkout.title')}
        showBack
        onBackPress={handleBack}
        rightActions={
          <Pressable
            onPress={() => router.push('/service')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('checkout.customerService')}
          >
            <Icon symbol="headset_mic" size={24} color={ON_PRIMARY} />
          </Pressable>
        }
      />
      <View style={styles.contentWrap}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
        {/* DELIVERY ADDRESS 卡 */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
              {t('checkout.section.deliveryAddress')}
            </Text>
            {defaultAddress && (
              <Pressable
                onPress={() => router.push('/address/list')}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.changeBtn,
                  { borderColor: colors['outline-variant'] },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('checkout.address.changeA11y')}
              >
                <Icon symbol="edit" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
          <Pressable
            testID="checkout-address"
            onPress={() => router.push('/address/list')}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            {defaultAddress ? (
              <View style={styles.addressBody}>
                <Icon symbol="location_on" size={20} color={colors.primary} />
                <View style={styles.addressText}>
                  <Text style={[styles.addrName, { color: colors['on-surface'] }]}>
                    {defaultAddress.name}
                  </Text>
                  <Text style={[styles.addrDetail, { color: colors['on-surface-variant'] }]}>
                    {defaultAddress.province}
                    {defaultAddress.city}
                    {defaultAddress.district}
                    {defaultAddress.detail}
                  </Text>
                </View>
              </View>
            ) : (
              // U3 无地址态：图标 + 文字 + 箭头，引导点击
              <View style={styles.noAddressRow}>
                <Icon symbol="add_location_alt" size={20} color={colors['on-surface-variant']} />
                <Text style={[styles.noAddress, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.selectAddress')}
                </Text>
                <Icon symbol="chevron_right" size={20} color={colors['on-surface-variant']} />
              </View>
            )}
          </Pressable>
        </View>

        {/* U6 支付 + 摘要紧凑分组（gap md），地址卡独立留 lg 间距 */}
        <View style={styles.detailGroup}>
        {/* PAYMENT METHOD 区 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('checkout.section.paymentMethod')}
          </Text>
          <View style={styles.paymentList}>
            {paymentMethods?.map((m) => {
              const selected = m.id === selectedMethod;
              return (
                <Pressable
                  key={m.id}
                  testID={`payment-${m.id}`}
                  onPress={() => setSelectedMethod(m.id)}
                  style={({ pressed }) => [
                    styles.paymentCard,
                    {
                      backgroundColor: colors['surface-container-lowest'],
                      borderColor: selected ? colors.primary : colors['outline-variant'],
                      borderWidth: selected ? 2 : 1,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={localize(m.name)}
                >
                  <View style={styles.paymentLeft}>
                    <View
                      style={[
                        styles.paymentIconBox,
                        {
                          backgroundColor: selected
                            ? colors.primary + '14' // 原因：选中态 8% primary tint（'14'=0x14≈8% alpha），dark 自适应
                            : colors['surface-container'],
                        },
                      ]}
                    >
                      <Icon
                        symbol={m.icon}
                        size={20}
                        color={selected ? colors.primary : colors.secondary}
                      />
                    </View>
                    <View style={styles.paymentText}>
                      <Text style={[styles.paymentName, { color: colors['on-surface'] }]}>
                        {localize(m.name)}
                      </Text>
                      {m.subtitle && (
                        <Text
                          style={[styles.paymentSubtitle, { color: colors['on-surface-variant'] }]}
                        >
                          {localize(m.subtitle)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Icon
                    symbol={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
                    size={20}
                    color={selected ? colors.primary : colors.outline}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ORDER SUMMARY 区 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('checkout.section.orderSummary')}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
            ]}
          >
            <View style={styles.summaryBody}>
              {selectedItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.noItems')}
                </Text>
              ) : (
                selectedItems.map((item) => (
                  <View key={item.id} style={styles.summaryItemRow}>
                    {/* U2 加 40×40 缩略图 */}
                    <Image
                      source={{ uri: item.product.image }}
                      style={styles.summaryThumb}
                    />
                    <View style={styles.summaryItemInfo}>
                      <Text
                        style={[styles.summaryItemName, { color: colors['on-surface'] }]}
                        numberOfLines={1}
                      >
                        {localize(item.product.name)}
                      </Text>
                      <Text style={[styles.summaryItemQty, { color: colors['on-surface-variant'] }]}>
                        × {item.quantity}
                      </Text>
                    </View>
                    <Text style={[styles.summaryValueBold, { color: colors['on-surface'] }]}>
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
              {/* U4 方案 F：SUMMARY 居中 + 两侧虚线（替 TaisDivider） */}
              <View style={styles.summaryDivider}>
                <View style={[styles.dashedLine, { borderBottomColor: colors['outline-variant'] }]} />
                <Text style={[styles.summaryDividerLabel, { color: colors.outline }]}>SUMMARY</Text>
                <View style={[styles.dashedLine, { borderBottomColor: colors['outline-variant'] }]} />
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.summary.subtotal')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors['on-surface-variant'] }]}>
                  ${subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.discountLabel, { color: colors.semantic.positive }]}>{t('checkout.summary.discount')}</Text>
                <Text style={[styles.discountLabel, { color: colors.semantic.positive }]}>-${DISCOUNT.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.summary.deliveryFee')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors['on-surface-variant'] }]}>
                  ${DELIVERY_FEE.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>
      {/* U5 submitting overlay：覆盖内容区，不挡底部栏（底部栏在 overlay 之后渲染，置顶可见） */}
      {submitting && (
        <View style={styles.submitOverlay}>
          <View
            style={[
              styles.submitOverlayCard,
              { backgroundColor: colors['surface-container-lowest'] },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.submitOverlayText, { color: colors['on-surface-variant'] }]}>
              {t('checkout.placingOrder')}
            </Text>
          </View>
        </View>
      )}
      </View>

      {/* 底部 bar：Secure Checkout + Final Total + 分隔线 + CONFIRM & PAY */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        <View style={styles.priceInfo}>
          <View style={styles.secureRow}>
            <Icon symbol="verified" size={14} color={colors.semantic.positive} />
            <Text style={[styles.secureText, { color: colors.semantic.positive }]}>{t('checkout.secure')}</Text>
          </View>
          <View style={styles.finalRow}>
            <Text style={[styles.finalLabel, { color: colors['on-surface-variant'] }]}>
              {t('checkout.summary.finalTotal')}
            </Text>
            <Text style={[styles.finalAmount, { color: colors.primary }]}>
              ${finalTotal.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors['outline-variant'] }]} />
        <Pressable
          testID="checkout-submit"
          onPress={submit}
          disabled={selectedItems.length === 0 || isOffline || submitting || createOrder.isPending}
          style={({ pressed }) => [
            styles.payBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.97 }] },
            (selectedItems.length === 0 || isOffline) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('checkout.confirmAndPay', { amount: finalTotal.toFixed(2) })}
        >
          <Text style={styles.payBtnText}>
            {t('checkout.confirmAndPay', { amount: finalTotal.toFixed(2) })}
          </Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: 140 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  // U5 内容区包裹层（承载 submitting overlay 绝对定位）
  contentWrap: { flex: 1, position: 'relative' },
  submitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // 原因：submitting 半透明遮罩，light/dark 通用
  },
  submitOverlayCard: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadowPresets.md,
  },
  submitOverlayText: {
    ...typography['body-md'],
    fontWeight: '600',
  },

  // Card 通用
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography['label-caps'],
    fontSize: 13, // U7 11→13 提升可读性（局部覆盖，不动 label-caps）
  },
  section: { gap: spacing.sm },
  // U6 地址卡与支付+摘要分组：detailGroup 内部紧凑
  detailGroup: { gap: spacing.md },

  // Address
  changeBtn: {
    // U7 改纯图标描边方按钮（32×32）
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addressBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addressText: { flex: 1, gap: 2 },
  addrName: { ...typography['body-sm'], fontWeight: '700' },
  addrDetail: { ...typography['body-sm'], fontSize: 12 },
  noAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noAddress: { ...typography['body-md'], flex: 1 },

  // Payment
  paymentList: { gap: spacing.sm },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentText: { gap: 2, flex: 1 },
  paymentName: { ...typography['body-sm'], fontWeight: '700' },
  paymentSubtitle: { ...typography['body-sm'], fontSize: 10 },

  // Order Summary
  summaryBody: { gap: spacing.sm },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { ...typography['body-sm'], flexShrink: 1 },
  summaryValue: { ...typography['body-sm'] },
  summaryValueBold: { ...typography['body-sm'], fontWeight: '700' },
  discountLabel: { ...typography['body-sm'] },
  // U2 商品行：缩略图 + 名称/数量 + 价格
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryThumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
  },
  summaryItemInfo: { flex: 1, gap: 2 },
  summaryItemName: { ...typography['body-sm'], fontWeight: '600', fontSize: 13 },
  summaryItemQty: { ...typography['body-sm'], fontSize: 11 },
  // U4 方案 F：SUMMARY 居中 + 两侧虚线
  summaryDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
  },
  summaryDividerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyText: { ...typography['body-md'], textAlign: 'center', padding: spacing.lg },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceInfo: { flex: 1, gap: 2 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  finalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  finalLabel: { ...typography['body-sm'], fontSize: 12 },
  finalAmount: {
    ...typography['price-display'],
    fontSize: 20,
    fontWeight: '700',
  },
  divider: { width: 1, height: 40 },
  payBtn: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    ...shadowPresets.md,
  },
  payBtnText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontSize: 13,
    fontWeight: '700',
  },
});
