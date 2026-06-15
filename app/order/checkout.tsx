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
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PriceText } from '@/components/ui/PriceText';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useCart } from '@/services/queries/useCart';
import { useAddresses } from '@/services/queries/useAddress';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PAYMENT_METHODS = [
  { id: 'wechat', labelKey: 'checkout.payment.wechat', icon: 'wechat' as const },
  { id: 'alipay', labelKey: 'checkout.payment.alipay', icon: 'alpha-c' as const },
  { id: 'cash', labelKey: 'checkout.payment.cash', icon: 'cash' as const },
];

export default function CheckoutPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: addresses } = useAddresses();
  const selectedItems = cart?.items.filter((i) => i.selected) ?? [];
  const defaultAddress = addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  if (isLoading) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <PageHeader title={t('checkout.title')} showBack onBackPress={() => router.back()} />
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
        <PageHeader title={t('checkout.title')} showBack onBackPress={() => router.back()} />
        <ErrorState message={t('checkout.loadError')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  const submit = () => {
    if (isOffline) {
      Alert.alert(t('checkout.offlineBlock'), t('checkout.offlineBlockDesc'));
      return;
    }
    router.push('/order/payment');
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('checkout.title')} showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
          testID="checkout-address"
          onPress={() => router.push('/address/list')}
          style={({ pressed }) => [
            styles.addressRow,
            { backgroundColor: colors['surface-container-low'], opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {defaultAddress ? (
            <View style={styles.addressInfo}>
              <View style={styles.addressHeader}>
                <Text style={[styles.addrName, { color: colors['on-surface'] }]}>
                  {defaultAddress.name}
                </Text>
                <Text style={[styles.addrPhone, { color: colors['on-surface-variant'] }]}>
                  {defaultAddress.phone}
                </Text>
              </View>
              <Text style={[styles.addrDetail, { color: colors['on-surface-variant'] }]}>
                {defaultAddress.province}
                {defaultAddress.city}
                {defaultAddress.district}
                {defaultAddress.detail}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noAddress, { color: colors['on-surface-variant'] }]}>
              {t('checkout.selectAddress')}
            </Text>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={colors['on-surface-variant']}
          />
        </Pressable>

        <Card>
          {selectedItems.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors['on-surface-variant'] }]}>
              {t('checkout.noItems')}
            </Text>
          ) : (
            selectedItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.itemName, { color: colors['on-surface'] }]}
                    numberOfLines={2}
                  >
                    {item.product.name}
                  </Text>
                  <Text style={[styles.itemQty, { color: colors['on-surface-variant'] }]}>
                    {t('checkout.itemQty', { count: item.quantity })}
                  </Text>
                </View>
                <PriceText value={item.product.price * item.quantity} size="md" />
              </View>
            ))
          )}
        </Card>

        <Card>
          {PAYMENT_METHODS.map((m, idx) => (
            <Pressable
              key={m.id}
              testID={`payment-${m.id}`}
              style={({ pressed }) => [
                styles.paymentRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors['outline-variant'],
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(m.labelKey)}
            >
              <MaterialCommunityIcons name={m.icon} size={22} color={colors.primary} />
              <Text style={[styles.paymentLabel, { color: colors['on-surface'] }]}>
                {t(m.labelKey)}
              </Text>
              <MaterialCommunityIcons name="radiobox-blank" size={20} color={colors.outline} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
        <View style={styles.priceBox}>
          <Text style={[styles.totalLabel, { color: colors['on-surface-variant'] }]}>
            {t('cart.total')}
          </Text>
          <PriceText value={cart?.totalPrice ?? 0} size="lg" />
        </View>
        <Button
          label={t('checkout.submit')}
          variant="primary"
          disabled={selectedItems.length === 0 || isOffline}
          onPress={submit}
          testID="checkout-submit"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  addressInfo: { flex: 1, gap: spacing.xs },
  addressHeader: { flexDirection: 'row', gap: spacing.sm },
  addrName: { ...typography['body-md'], fontWeight: '600' },
  addrPhone: { ...typography['body-sm'] },
  addrDetail: { ...typography['body-sm'], lineHeight: 20 },
  noAddress: { flex: 1, ...typography['body-md'] },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemName: { ...typography['body-sm'] },
  itemQty: { ...typography['label-caps'] },
  emptyText: { ...typography['body-md'], textAlign: 'center', padding: spacing.lg },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
  },
  paymentLabel: { ...typography['body-md'], flex: 1 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  priceBox: { flex: 1, alignItems: 'flex-end', gap: 2 },
  totalLabel: { ...typography['label-caps'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
