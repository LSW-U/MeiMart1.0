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
import { isMockMode } from '@/services/api';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { CouponPicker } from '@/components/business/CouponPicker/CouponPicker';
import { useCart, useCheckoutPreview, useClearCart } from '@/services/queries/useCart';
import { useAddresses } from '@/services/queries/useAddress';
import { useAddressSelectionStore, resolveCheckoutAddress } from '@/store/addressSelectionStore';
import { usePaymentMethods } from '@/services/queries/usePayment';
import { useCreateOrder } from '@/services/queries/useOrders';
import { useCoupons } from '@/services/queries/usePromotion';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { formatEta } from '@/utils/format';
import { useState } from 'react';

// Why: mock demo 金额（与 cart 页一致）。real 模式由 useCheckoutPreview 一次拿全金额
//      —— preview.payableAmount 后端已聚合（itemsSubtotal + deliveryFee - discount，传 couponCode 时算折扣）。
//      ⚠️ checkout 券选择 Modal 无 HTML 原型（CheckoutPage.html 无券 UI），视觉参照
//      模块化处理HTML/优惠券卡片模块-优化原型.html compact-ticket（与 CouponPicker 注释同口径）。
const MOCK_DISCOUNT = 5.0;
const MOCK_DELIVERY_FEE = 0.0;

// 原因：客服 / CONFIRM&PAY 按钮上的固定白字（primary 红底），两种模式不变。
// 不可用 colors['on-primary']：dark 模式翻为 #690005（暗红）叠红底会裂色（同 P2/P3）。
const ON_PRIMARY = '#ffffff';

export default function CheckoutPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t, i18n: i18nInstance } = useTranslation();
  const localize = useLocalizer();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: addresses } = useAddresses();
  // Why: P16 决策 6 —— 地址列表（from='checkout' 选择模式）选中的地址优先于 isDefault，
  //      只影响本次结算会话，不改用户的默认地址数据
  const selectedAddressId = useAddressSelectionStore((s) => s.selectedId);
  const { data: paymentMethods } = usePaymentMethods();
  const createOrder = useCreateOrder();
  const clearCart = useClearCart();
  const selectedItems = cart?.items.filter((i) => i.selected) ?? [];
  const defaultAddress = resolveCheckoutAddress(addresses, selectedAddressId);
  // Why: real 模式选券 —— selectedCouponCode 驱动 preview 重查（key 含 couponCode），后端聚合 discount
  const [selectedCouponCode, setSelectedCouponCode] = useState<string | undefined>(undefined);
  const [showCouponModal, setShowCouponModal] = useState(false);
  // Why: 券列表（Modal 数据源，real + mock 都拉，mock 走 mockDb 适配）
  const { data: coupons } = useCoupons();
  // Why: real 模式按默认地址 + 选中券查运费 + 折扣聚合；mock 模式不调（enabled 内已 gate），preview 为 undefined
  const { data: preview } = useCheckoutPreview(defaultAddress?.id, selectedCouponCode);

  const defaultMethodId = paymentMethods?.find((m) => m.isDefault)?.id ?? paymentMethods?.[0]?.id;
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(defaultMethodId);
  // Why: 防止 submit 期间重复点击（Promise.all 查 SKU 时 createOrder.isPending 还是 false）
  const [submitting, setSubmitting] = useState(false);

  // Why: subtotal 用本地购物车算（line item 单价 × 数量，与商品行展示一致）。
  //      real 模式 payableAmount 后端已聚合（itemsSubtotal + deliveryFee - discount），直接用作实付；
  //      discount 用 preview.discount（传券时后端聚合）；mock/preview 未加载用 demo 常量。
  const subtotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const deliveryFee = preview?.deliveryFee ?? (isMockMode ? MOCK_DELIVERY_FEE : 0);
  const discount = preview?.discount ?? (isMockMode ? MOCK_DISCOUNT : 0);
  const finalTotal = preview?.payableAmount ?? Math.max(0, subtotal - discount + deliveryFee);

  // Why: B9 ETA —— 后端 CheckoutPreview.estimatedDeliveryTime（按仓库+地址 PostGIS 算的预估送达）。
  //      real 模式才有（mock 不调 preview），按当前 locale 格式化「M月D日 HH:mm」。
  const etaLocale = i18nInstance.language === 'zh' ? 'zh-CN' : 'en-US';
  const etaText = preview?.estimatedDeliveryTime
    ? formatEta(preview.estimatedDeliveryTime, etaLocale)
    : null;

  if (isLoading) {
    return (
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
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
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
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
      // Why: 清掉本次下单的选中项，防回购物车重复下单（订单已成功，清购物车失败不误报下单失败）。
      // useClearCart 自带乐观更新（缓存瞬间清空）+ onSettled invalidate 校准。
      try {
        await clearCart.mutateAsync();
      } catch (e) {
        console.warn('[checkout] clearCart failed:', e);
      }
      // Why: 下单成功清除本次会话的手选地址，避免污染下次结算（P16 决策 6）
      useAddressSelectionStore.getState().clear();
      toast.success(t('checkout.orderPlaced', { defaultValue: 'Order placed' }));
      // Why: P28 - replace 传 orderId/orderNo，result 页拉详情渲染成功态（按 HTML PaymentResultPage 还原）。
      //     replace 不入栈，避免返回键回到 checkout 重复下单
      router.replace({
        pathname: '/order/result',
        params: { orderId: order.id, orderNo: order.orderNo },
      });
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
    <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
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
                onPress={() => router.push({ pathname: '/address/list', params: { from: 'checkout' } })}
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
            onPress={() => router.push({ pathname: '/address/list', params: { from: 'checkout' } })}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={
              defaultAddress
                ? `${defaultAddress.name}，${defaultAddress.district}${defaultAddress.detail}`
                : t('checkout.selectAddress')
            }
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
          {/* B9 配送时效 ETA：real 模式 preview 返回的预估送达时间（mock 不展示） */}
          {etaText && (
            <View style={styles.etaRow}>
              <Icon symbol="schedule" size={14} color={colors.semantic.positive} />
              <Text style={[styles.etaText, { color: colors.semantic.positive }]}>
                {t('checkout.estimatedDelivery', { time: etaText })}
              </Text>
            </View>
          )}
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
                      {/* B1 库存提示：库存 ≤ 购买量时警告「仅剩 X 件」（避免下单后才报 STOCK_EXCEEDED） */}
                      {item.product.stock != null &&
                        item.product.stock > 0 &&
                        item.product.stock <= item.quantity && (
                          <Text style={[styles.stockWarn, { color: colors.semantic.warning }]}>
                            {t('checkout.stockLow', { stock: item.product.stock })}
                          </Text>
                        )}
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
              {/* Why: mock 纯展示 demo 折扣；real 模式整行可点 → 打开选券 Modal（preview 传 couponCode 聚合 discount） */}
              {isMockMode ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.discountLabel, { color: colors.semantic.positive }]}>{t('checkout.summary.discount')}</Text>
                  <Text style={[styles.discountLabel, { color: colors.semantic.positive }]}>-${discount.toFixed(2)}</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowCouponModal(true)}
                  style={styles.summaryRow}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedCouponCode ? t('checkout.coupon.change') : t('checkout.coupon.select')
                  }
                >
                  <View style={styles.couponEntryLeft}>
                    <Icon symbol="confirmation_number" size={16} color={colors.semantic.positive} />
                    <Text
                      style={[styles.discountLabel, { color: colors.semantic.positive }]}
                      numberOfLines={1}
                    >
                      {selectedCouponCode ?? t('checkout.coupon.select')}
                    </Text>
                  </View>
                  <View style={styles.couponEntryRight}>
                    {discount > 0 && (
                      <Text style={[styles.discountLabel, { color: colors.semantic.positive }]}>
                        -${discount.toFixed(2)}
                      </Text>
                    )}
                    <Icon symbol="chevron_right" size={16} color={colors['on-surface-variant']} />
                  </View>
                </Pressable>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors['on-surface-variant'] }]}>
                  {t('checkout.summary.deliveryFee')}
                </Text>
                <Text style={[styles.summaryValue, { color: colors['on-surface-variant'] }]}>
                  ${deliveryFee.toFixed(2)}
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
      {/* ⚠️ 无 HTML 原型：选券 Modal 视觉参照 模块化处理HTML/优惠券卡片模块-优化原型.html compact-ticket */}
      <CouponPicker
        visible={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        coupons={coupons ?? []}
        orderAmount={subtotal}
        selectedCode={selectedCouponCode}
        onSelect={setSelectedCouponCode}
      />
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
    fontSize: 15, // U7 11→13→15 提升可读性 + 用户要求 Delivery address 字体大一点（3 section 共用统一）
    fontWeight: '800', // 用户要求加粗（label-caps 默认 700，覆盖 800）
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
  // 选券入口（discount 行 real 模式）：左 icon+code，右 -金额+chevron
  couponEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  couponEntryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // B9 ETA 行（地址卡底部）：icon + 预估送达
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
  },
  etaText: { ...typography['label-caps'], fontSize: 11 },
  // B1 库存警告（商品行 quantity 下方，仅库存紧张时显示）
  stockWarn: { ...typography['label-caps'], fontSize: 10 },
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
