// AddressListPage — 还原自 AddressEditPage.html（283 行，HTML 文件名与内容反向）
// HTML 行数 283 → RN ~330（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + location_on/location_city/person/call/home/arrow_back/check_circle/radio_button_unchecked/edit/delete + uma-lulik 分隔
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import {
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/services/queries/useAddress';
import type { Address } from '@/types';

export default function AddressListPage() {
  const { colors } = useTheme();
  const { data: addresses, isLoading, isError, refetch } = useAddresses();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const handleDelete = (addr: Address) => {
    Alert.alert('Delete Address', `Remove "${addr.name}" from saved addresses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(addr.id),
      },
    ]);
  };

  const handleSetDefault = (addr: Address) => {
    if (!addr.isDefault) {
      setDefaultMutation.mutate(addr.id);
    }
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header title="Manage Address" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message="Failed to load addresses" onRetry={() => refetch()} />
      ) : !addresses || addresses.length === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyState
            title="No saved addresses"
            description="Add an address to speed up checkout"
            icon="map-marker-plus"
            actionLabel="Add Address"
            onAction={() => router.push('/address/edit')}
          />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
          {/* Add New Address 按钮（HTML 第 160-162 行） */}
          <Pressable
            onPress={() => router.push('/address/edit')}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add new address"
          >
            <Icon symbol="add_location_alt" size={22} color="#ffffff" />
            <Text style={styles.addBtnText}>Add New Address</Text>
          </Pressable>

          {/* Saved Addresses 标题（HTML 第 164-165 行） */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              Saved Addresses
            </Text>
          </View>

          {/* 地址列表 */}
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: Address }) => (
              <AddressRow
                address={item}
                onSelect={() => {
                  handleSetDefault(item);
                  router.back();
                }}
                onEdit={() => router.push({ pathname: '/address/edit', params: { id: item.id } })}
                onDelete={() => handleDelete(item)}
              />
            )}
          />

          {/* Cultural Motif Separator（HTML 第 258-265 行 — uma-lulik-silhouette 三角） */}
          <View style={styles.motifRow}>
            <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
            <MotifTriangle size={16} color={colors.primary} opacity={1} />
            <MotifTriangle size={24} color={colors.primary} opacity={0.6} />
            <MotifTriangle size={16} color={colors.primary} opacity={1} />
            <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
          </View>
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
}

// uma-lulik-silhouette triangle（HTML 第 117-119 行 — clip-path polygon 三角形）
function MotifTriangle({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        opacity,
      }}
    />
  );
}

// PrimaryHeader（HTML 第 141-157 行 — primary + tais-pattern + MANAGE bar + arrow_back + help）
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="header">
      {/* MANAGE YOUR ADDRESSES — h-8 primary tracker */}
      <View style={[styles.trackerBar, { backgroundColor: colors.primary }]}>
        <Text style={styles.trackerText}>MANAGE YOUR ADDRESSES</Text>
      </View>
      {/* 主 header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerPattern} pointerEvents="none">
          <TaisPattern width={390} height={72} opacity={0.2} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon symbol="arrow_back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help_outline" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 地址行（HTML 第 167-256 行 — radio + name + DEFAULT badge + edit/delete + call + location_on）
function AddressRow({
  address,
  onSelect,
  onEdit,
  onDelete,
}: {
  address: Address;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const isDefault = !!address.isDefault;
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.addressCard,
        {
          backgroundColor: isDefault
            ? colors['surface-container-low']
            : colors['surface-container-lowest'],
          borderColor: isDefault ? colors.primary : colors['outline-variant'],
        },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isDefault }}
      accessibilityLabel={`Address for ${address.name}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameRow}>
          <Icon
            symbol={isDefault ? 'check_circle' : 'radio_button_unchecked'}
            size={20}
            color={isDefault ? colors.primary : colors['outline-variant']}
          />
          <Text style={[styles.name, { color: colors['on-surface'] }]} numberOfLines={1}>
            {address.name}
          </Text>
          {isDefault && (
            <View style={[styles.defaultPill, { backgroundColor: colors['tertiary-fixed'] }]}>
              <Text style={[styles.defaultPillText, { color: colors['on-tertiary-fixed'] }]}>
                DEFAULT
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actionRow}>
          <Pressable
            onPress={onEdit}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${address.name}`}
          >
            <Icon symbol="edit" size={18} color={colors['on-surface-variant']} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${address.name}`}
          >
            <Icon symbol="delete" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Icon symbol="call" size={14} color={colors['on-surface-variant']} />
          <Text style={[styles.infoText, { color: colors['on-surface-variant'] }]}>
            {address.phone}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon symbol="location_on" size={14} color={colors['on-surface-variant']} />
          <Text
            style={[styles.infoText, { color: colors['on-surface-variant'] }]}
            numberOfLines={2}
          >
            {address.detail}, {address.city}
            {'\n'}
            {address.province}, Timor-Leste
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Header
  trackerBar: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  header: {
    position: 'relative',
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
  },
  // Body
  scroll: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  addBtnText: {
    color: '#ffffff',
    ...typography['body-md'],
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  // Address Card
  addressCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  name: {
    ...typography['body-md'],
    fontWeight: '700',
    flexShrink: 1,
  },
  defaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionBtn: {
    padding: spacing.xs,
  },
  cardBody: {
    paddingLeft: 28,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    ...typography['body-sm'],
    flex: 1,
    lineHeight: 18,
  },
  // Motif
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
  },
  motifLine: {
    height: 1,
    flex: 1,
  },
});
