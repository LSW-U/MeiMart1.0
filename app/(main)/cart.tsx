import { StyleSheet, View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { CartItemRow } from '@/components/business/CartItemRow';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { PriceText } from '@/components/ui/PriceText';
import {
  useCart,
  useRemoveCartItem,
  useToggleCartItem,
  useUpdateCartItem,
} from '@/services/queries/useCart';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import type { CartItem } from '@/types';

export default function CartPage() {
  const { colors } = useTheme();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const removeMutation = useRemoveCartItem();
  const toggleMutation = useToggleCartItem();
  const updateMutation = useUpdateCartItem();

  const isEmpty = !cart || cart.items.length === 0;
  const allSelected = !isEmpty && cart.items.every((i) => i.selected);
  const totalPrice = cart?.totalPrice ?? 0;
  const totalItems = cart?.totalItems ?? 0;

  const toggleAll = () => {
    cart?.items.forEach((item) => {
      if (item.selected === allSelected) {
        toggleMutation.mutate({ itemId: item.id, selected: !allSelected });
      }
    });
  };

  const remove = (item: CartItem) => {
    Alert.alert('确认删除', `从购物车移除「${item.product.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => removeMutation.mutate(item.id),
      },
    ]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <View style={[styles.header, { backgroundColor: colors['surface-container-lowest'] }]}>
        <Text style={[styles.title, { color: colors['on-surface'] }]} accessibilityRole="header">
          购物车
        </Text>
      </View>
      {isOffline && <OfflineBanner />}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="加载购物车失败" onRetry={() => refetch()} />
      ) : isEmpty ? (
        <View style={styles.emptyBox}>
          <EmptyState
            title="购物车是空的"
            description="快去挑选你喜欢的商品吧"
            icon="cart-outline"
            actionLabel="去逛逛"
            onAction={() => router.push('/(main)/home')}
          />
        </View>
      ) : (
        <>
          <FlatList
            data={cart.items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.itemWrap}>
                <Checkbox
                  checked={item.selected}
                  onChange={(checked) =>
                    toggleMutation.mutate({ itemId: item.id, selected: checked })
                  }
                />
                <View style={styles.rowBody}>
                  <CartItemRow
                    item={item}
                    onQuantityChange={(qty) =>
                      updateMutation.mutate({ itemId: item.id, updates: { quantity: qty } })
                    }
                    onDelete={() => remove(item)}
                    showControls
                  />
                </View>
              </View>
            )}
          />
          <View style={[styles.bottomBar, { backgroundColor: colors['surface-container-lowest'] }]}>
            <Checkbox checked={allSelected} onChange={toggleAll} label="全选" />
            <View style={styles.priceBox}>
              <Text style={[styles.totalLabel, { color: colors['on-surface-variant'] }]}>合计</Text>
              <PriceText value={totalPrice} size="lg" />
            </View>
            <Button
              label={`结算 (${totalItems})`}
              variant="primary"
              disabled={totalItems === 0 || isOffline}
              onPress={() => router.push('/order/checkout')}
            />
          </View>
        </>
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  title: { ...typography.h3, fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: 120 },
  itemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  rowBody: { flex: 1 },
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
  emptyBox: { flex: 1, justifyContent: 'center' },
});
