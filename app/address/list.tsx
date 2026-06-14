import { StyleSheet, View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { AddressCard } from '@/components/business/AddressCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAddresses, useDeleteAddress } from '@/services/queries/useAddress';
import type { Address } from '@/types';

export default function AddressListPage() {
  const { colors } = useTheme();
  const { data: addresses, isLoading, isError, refetch } = useAddresses();
  const deleteMutation = useDeleteAddress();

  const handleDelete = (addr: Address) => {
    Alert.alert('确认删除', '确定删除此地址？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(addr.id),
      },
    ]);
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="收货地址" showBack onBackPress={() => router.back()} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="加载地址失败" onRetry={() => refetch()} />
      ) : !addresses || addresses.length === 0 ? (
        <EmptyState
          title="还没有收货地址"
          description="新增一个地址方便下单"
          icon="map-marker-plus"
          actionLabel="新增地址"
          onAction={() => router.push('/address/edit')}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AddressCard
              address={item}
              onPress={() => router.back()}
              onEdit={() => router.push({ pathname: '/address/edit', params: { id: item.id } })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
      <View style={styles.footer}>
        <Button
          label="+ 新增地址"
          variant="primary"
          fullWidth
          onPress={() => router.push('/address/edit')}
          testID="address-add"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'transparent',
  },
});
