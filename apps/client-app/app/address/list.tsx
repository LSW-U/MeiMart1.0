// AddressListPage — 还原自 AddressEditPage.html（283 行，HTML 文件名与内容反向）
// HTML 行数 283 → RN ~330（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + location_on/location_city/person/call/home/arrow_back/check_circle/radio_button_unchecked/edit/delete + uma-lulik 分隔
// P16: 全部硬编码文案接 i18n（决策 1）+ 结算页选择回传（决策 6）+ 卡片排版收紧（决策 11）
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import { useAddressSelectionStore } from '@/store/addressSelectionStore';
import {
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/services/queries/useAddress';
import type { Address } from '@/types';

export default function AddressListPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Why: 决策 6 —— checkout 跳来带 from='checkout'，点地址=选中并返回（写中转 store）；
  //      个人中心跳来是管理模式，点地址只设默认不退出
  const { from } = useLocalSearchParams<{ from?: string }>();
  const isSelectMode = from === 'checkout';
  const selectAddress = useAddressSelectionStore((s) => s.select);
  const { data: addresses, isLoading, isError, refetch } = useAddresses();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const handleDelete = (addr: Address) => {
    // Why: Web 端 Alert.alert 不显示，直接删除 + toast；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      deleteMutation.mutate(addr.id, {
        onSuccess: () => toast.success(t('address.deleted', { defaultValue: 'Address deleted' })),
        onError: () => toast.error(t('errors.generic')),
      });
      return;
    }
    Alert.alert(t('address.removeTitle'), t('address.removeConfirm', { name: addr.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('address.removeAction'),
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

  const handleSelect = (addr: Address) => {
    if (isSelectMode) {
      selectAddress(addr.id);
      router.back();
      return;
    }
    // Why: 管理模式点击地址只设为默认，不自动退出（用户用返回按钮退出）
    handleSetDefault(addr);
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={t('address.list', { defaultValue: 'Manage Address' })} />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState
          message={t('address.loadFailed', { defaultValue: 'Failed to load addresses' })}
          onRetry={() => refetch()}
        />
      ) : !addresses || addresses.length === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyState
            title={t('address.empty', { defaultValue: 'No saved addresses' })}
            description={t('address.emptyDesc', {
              defaultValue: 'Add an address to speed up checkout',
            })}
            icon="map-marker-plus"
            actionLabel={t('address.add', { defaultValue: 'Add Address' })}
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
            accessibilityLabel={t('address.a11y.addNew')}
          >
            <Icon symbol="add_location_alt" size={22} color={colors['on-primary']} />
            <Text style={[styles.addBtnText, { color: colors['on-primary'] }]}>
              {t('address.add', { defaultValue: 'Add New Address' })}
            </Text>
          </Pressable>

          {/* Saved Addresses 标题（HTML 第 164-165 行） */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('address.savedAddresses', { defaultValue: 'Saved Addresses' })}
            </Text>
          </View>

          {/* 地址列表 */}
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={5}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: Address }) => (
              <AddressRow
                address={item}
                onSelect={() => handleSelect(item)}
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
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  return (
    <View accessibilityRole="header">
      {/* MANAGE YOUR ADDRESSES — h-8 primary tracker */}
      <View style={[styles.trackerBar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.trackerText, { color: colors['on-primary'] }]}>
          MANAGE YOUR ADDRESSES
        </Text>
      </View>
      {/* 主 header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerPattern} pointerEvents="none">
          <TaisPattern width={390} height={72} opacity={0.2} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
          >
            <Icon symbol="arrow_back" size={24} color={colors['on-primary']} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors['on-primary'] }]}>{title}</Text>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.help')}
          >
            <Icon symbol="help_outline" size={24} color={colors['on-primary']} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// 地址行（HTML 第 167-256 行 — radio + name + DEFAULT badge + edit/delete + call + location_on）
// P16 决策 11 排版收紧：name + phone 同行 → DEFAULT pill → 地址单行截断（去掉 call/location_on icon 噪音）
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
  const { t } = useTranslation();
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
      accessibilityLabel={t('address.a11y.selectThis', { name: address.name })}
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
          <Text
            style={[styles.phoneInline, { color: colors['on-surface-variant'] }]}
            numberOfLines={1}
          >
            {address.phone}
          </Text>
          {isDefault && (
            <View style={[styles.defaultPill, { backgroundColor: colors['tertiary-fixed'] }]}>
              <Text style={[styles.defaultPillText, { color: colors['on-tertiary-fixed'] }]}>
                {t('address.default', { defaultValue: 'Default' })}
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
            accessibilityLabel={t('address.a11y.edit', { name: address.name })}
          >
            <Icon symbol="edit" size={18} color={colors['on-surface-variant']} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={t('address.a11y.delete', { name: address.name })}
          >
            <Icon symbol="delete" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
      <View style={styles.cardBody}>
        {/* P16 决策 11：地址单行截断；Timor-Leste 国名硬编码移除（东帝汶-only 场景冗余，R2） */}
        <Text
          style={[styles.infoText, { color: colors['on-surface-variant'] }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {address.detail}, {address.city}, {address.province}
        </Text>
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  header: {
    position: 'relative',
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
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
    fontWeight: '700',
    fontSize: 20,
  },
  // Body
  scroll: {
    padding: layout['container-margin'],
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
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  name: {
    ...typography['body-md'],
    fontWeight: '700',
    flexShrink: 1,
  },
  phoneInline: {
    ...typography['body-sm'],
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
    marginTop: spacing.xs,
    paddingLeft: 28,
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
