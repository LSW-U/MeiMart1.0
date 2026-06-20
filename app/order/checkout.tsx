import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { Icon } from '@/components/ui/Icon';
import { useCart } from '@/services/queries/useCart';
import { useAddresses } from '@/services/queries/useAddress';
import { usePaymentMethods } from '@/services/queries/usePayment';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { useState } from 'react';

const DISCOUNT = 5.0; // mock 优惠金额（与 cart 页一致）
const DELIVERY_FEE = 0.0; // mock 满 $20 免运费

export default function CheckoutPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: addresses } = useAddresses();
  const { data: paymentMethods } = usePaymentMethods();
  const selectedItems = cart?.items.filter((i) => i.selected) ?? [];
  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const defaultMethodId = paymentMethods?.find((m) => m.isDefault)?.id ?? paymentMethods?.[0]?.id;
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(defaultMethodId);

  const subtotal = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const finalTotal = Math.max(0, subtotal - DISCOUNT + DELIVERY_FEE);

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PrimaryHeader title={t('checkout.title')} showBack onBackPress={() => router.back()} />
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
        <PrimaryHeader title={t('checkout.title')} showBack onBackPress={() => router.back()} />
        <ErrorState message={t('checkout.loadError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const submit = () => {
    if (isOffline) {
      Alert.alert(t('checkout.offlineBlock'), t('checkout.offlineBlockDesc'));
      return;
    }
    router.push('/order/result');
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PrimaryHeader
        title={t('checkout.title')}
        showBack
        onBackPress={() => router.back()}
        rightActions={
          <Pressable
            onPress={() => router.push('/service/customer')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('checkout.customerService')}
          >
            <Icon symbol="headset_mic" size={24} color="#ffffff" />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
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
                style={({ pressed }) => [styles.changeBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={t('checkout.address.changeA11y')}
              >
                <Icon symbol="edit" size={16} color={colors.primary} />
                <Text
                  style={[styles.changeText, { color: colors.primary }]}
                  accessibilityLabel={t('checkout.address.change')}
                >
                  {t('checkout.address.change')}
                </Text>
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
              <Text style={[styles.noAddress, { color: colors['on-surface-variant'] }]}>
                {t('checkout.selectAddress')}
              </Text>
            )}
          </Pressable>
        </View>

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
                            ? 'rgba(150,24,19,0.1)'
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
                  <View key={item.id} style={styles.summaryRow}>
                    <Text
                      style={[styles.summaryLabel, { color: colors['on-surface-variant'] }]}
                      numberOfLines={1}
                    >
                      {localize(item.product.name)} (x{item.quantity})
                    </Text>
                    <Text style={[styles.summaryValueBold, { color: colors['on-surface'] }]}>
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
              <View style={styles.dividerRow}>
                <TaisDivider width={120} />
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
                <Text style={styles.discountLabel}>{t('checkout.summary.discount')}</Text>
                <Text style={styles.discountLabel}>-${DISCOUNT.toFixed(2)}</Text>
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
      </ScrollView>

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
            <Icon symbol="verified" size={14} color="#16a34a" />
            <Text style={styles.secureText}>{t('checkout.secure')}</Text>
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
          disabled={selectedItems.length === 0 || isOffline}
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
    fontSize: 11,
  },
  section: { gap: spacing.sm },

  // Address
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  changeText: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  addressBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addressText: { flex: 1, gap: 2 },
  addrName: { ...typography['body-sm'], fontWeight: '700' },
  addrDetail: { ...typography['body-sm'], fontSize: 12 },
  noAddress: { ...typography['body-md'] },

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
  discountLabel: { ...typography['body-sm'], color: '#16a34a' },
  dividerRow: { marginVertical: spacing.xs },
  emptyText: { ...typography['body-md'], textAlign: 'center', padding: spacing.lg },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['container-margin'],
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  priceInfo: { flex: 1, gap: 2 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  secureText: {
    ...typography['label-caps'],
    fontSize: 10,
    color: '#16a34a',
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
    color: '#ffffff',
    ...typography['label-caps'],
    fontSize: 13,
    fontWeight: '700',
  },
});
