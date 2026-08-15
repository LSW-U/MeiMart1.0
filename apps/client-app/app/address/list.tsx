// AddressListPage — 还原自 AddressEditPage.html（283 行，HTML 文件名与内容反向）
// HTML 行数 283 → RN ~330（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + location_on/location_city/person/call/home/arrow_back/check_circle/radio_button_unchecked/edit/delete + uma-lulik 分隔
// P16: 全部硬编码文案接 i18n（决策 1）+ 结算页选择回传（决策 6）+ 卡片排版收紧（决策 11）
import { useRef, useState } from 'react';
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
 TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader/PrimaryHeader';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import { useAddressSelectionStore } from '@/store/addressSelectionStore';
import {
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from '@/services/queries/useAddress';
import type { Address } from '@/types';
import { getAddressTagTheme } from '@/theme/tagThemes';
import { parseAddressText } from '@/utils/addressParse';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Swipeable } from 'react-native-gesture-handler';

export default function AddressListPage() {
  const handleBack = useSafeBack();
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

  // P16 决策 9 —— 智能地址识别 Modal
  const [smartVisible, setSmartVisible] = useState(false);
  const [smartText, setSmartText] = useState('');

  const handleSmartParse = () => {
    const parsed = parseAddressText(smartText);
    if (!parsed.phone && !parsed.name) {
      toast.error(t('address.smartParseFailed', { defaultValue: 'Could not recognize name or phone' }));
      return;
    }
    setSmartVisible(false);
    setSmartText('');
    router.push({
      pathname: '/address/edit',
      params: {
        prefillName: parsed.name,
        prefillPhone: parsed.phone,
        prefillDetail: parsed.detail,
      },
    });
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
      <PrimaryHeader
        title={t('address.list', { defaultValue: 'Manage Address' })}
        showBack
        onBackPress={handleBack}
        rightActions={
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.help')}
          >
            <Icon symbol="help_outline" size={24} color={colors['on-primary']} />
          </Pressable>
        }
      />

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
          {/* P16 决策 9 —— 智能识别入口（粘贴文本自动解析填充） */}
          <Pressable
            onPress={() => setSmartVisible(true)}
            style={({ pressed }) => [
              styles.smartEntry,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('address.smartRecognize', { defaultValue: 'Smart recognize' })}
          >
            <Icon symbol="content_paste" size={18} color={colors.primary} />
            <View style={styles.smartEntryText}>
              <Text style={[styles.smartEntryTitle, { color: colors['on-surface'] }]}>
                {t('address.smartRecognize', { defaultValue: 'Smart Recognize' })}
              </Text>
              <Text style={[styles.smartEntryDesc, { color: colors['on-surface-variant'] }]}>
                {t('address.smartRecognizeDesc', {
                  defaultValue: 'Paste address text, auto-fill name & phone',
                })}
              </Text>
            </View>
            <Icon symbol="chevron_right" size={20} color={colors['on-surface-variant']} />
          </Pressable>

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
                onSetDefault={() => handleSetDefault(item)}
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

      {/* P16 决策 9 —— 智能识别 Modal */}
      <Modal
        visible={smartVisible}
        onClose={() => setSmartVisible(false)}
        title={t('address.smartRecognize', { defaultValue: 'Smart Recognize' })}
      >
        <TextInput
          style={[
            styles.smartInput,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
              color: colors['on-surface'],
            },
          ]}
          placeholder={t('address.smartPlaceholder', {
            defaultValue: 'Maria Silva, 7712 3456, Rua de Lecidere, Dili',
          })}
          placeholderTextColor={colors['on-surface-variant']}
          value={smartText}
          onChangeText={setSmartText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          testID="smart-parse-input"
        />
        <Button
          label={t('address.parseAndFill', { defaultValue: 'Parse and Fill' })}
          variant="primary"
          onPress={handleSmartParse}
          disabled={!smartText.trim()}
        />
      </Modal>
    </SafeAreaWrapper>
  );
}

// P16 决策 7 —— 地址标签 chip：家=蓝 / 公司=琥珀 / 学校=绿 / 自定义=灰（theme/tagThemes 场景色板）
export function AddressTagChip({ tag }: { tag: string }) {
  const { t } = useTranslation();
  const presetLabel: Record<'home' | 'company' | 'school', string> = {
    home: t('address.tagHome', { defaultValue: 'Home' }),
    company: t('address.tagCompany', { defaultValue: 'Company' }),
    school: t('address.tagSchool', { defaultValue: 'School' }),
  };
  const isPreset = tag in presetLabel;
  const theme = getAddressTagTheme(tag);
  return (
    <View style={[styles.tagChip, { backgroundColor: theme.bg }]}>
      <Text style={[styles.tagChipText, { color: theme.fg }]} numberOfLines={1}>
        {isPreset ? presetLabel[tag as 'home' | 'company' | 'school'] : tag}
      </Text>
    </View>
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

// 地址行（HTML 第 167-256 行 — radio + name + DEFAULT badge + 左滑操作）
// P16 决策 11 排版收紧：name + phone 同行 → tag/DEFAULT chip → 地址单行截断
// P16 决策 8 左滑操作：卡片右滑露出 设默认/编辑/删除（替代原右上角 18px 小图标，避免误触）
function AddressRow({
  address,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const swipeableRef = useRef<Swipeable>(null);
  const isDefault = !!address.isDefault;

  // Why: 操作后收起滑出区，避免卡片停留在半开状态
  const runAndClose = (fn: () => void) => () => {
    swipeableRef.current?.close();
    fn();
  };

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      {!isDefault && (
        <Pressable
          onPress={runAndClose(onSetDefault)}
          style={[styles.swipeBtn, { backgroundColor: colors['surface-container-high'] }]}
          accessibilityRole="button"
          accessibilityLabel={t('address.setDefault', { defaultValue: 'Set as default' })}
        >
          <Icon symbol="check_circle" size={20} color={colors['on-surface-variant']} />
          <Text
            style={[styles.swipeBtnText, { color: colors['on-surface-variant'] }]}
            numberOfLines={1}
          >
            {t('address.setDefault', { defaultValue: 'Set as default' })}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={runAndClose(onEdit)}
        style={[styles.swipeBtn, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={t('address.a11y.edit', { name: address.name })}
      >
        <Icon symbol="edit" size={20} color={colors['on-primary']} />
        <Text style={[styles.swipeBtnText, { color: colors['on-primary'] }]} numberOfLines={1}>
          {t('common.edit', { defaultValue: 'Edit' })}
        </Text>
      </Pressable>
      <Pressable
        onPress={runAndClose(onDelete)}
        style={[styles.swipeBtn, { backgroundColor: colors.error }]}
        accessibilityRole="button"
        accessibilityLabel={t('address.a11y.delete', { name: address.name })}
      >
        <Icon symbol="delete" size={20} color={colors['on-primary']} />
        <Text style={[styles.swipeBtnText, { color: colors['on-primary'] }]} numberOfLines={1}>
          {t('common.delete', { defaultValue: 'Delete' })}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
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
          {/* DEFAULT pill：有 tag 时挪到 chip 行，无 tag 时保留 name 行尾 */}
          {isDefault && !address.tag && (
            <View style={[styles.defaultPill, { backgroundColor: colors['tertiary-fixed'] }]}>
              <Text style={[styles.defaultPillText, { color: colors['on-tertiary-fixed'] }]}>
                {t('address.default', { defaultValue: 'Default' })}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          {!!address.tag && (
            <View style={styles.chipRow}>
              <AddressTagChip tag={address.tag} />
              {isDefault && (
                <View style={[styles.defaultPill, { backgroundColor: colors['tertiary-fixed'] }]}>
                  <Text style={[styles.defaultPillText, { color: colors['on-tertiary-fixed'] }]}>
                    {t('address.default', { defaultValue: 'Default' })}
                  </Text>
                </View>
              )}
            </View>
          )}
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
    </Swipeable>
  );
}

const styles = StyleSheet.create({
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
  smartEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  smartEntryText: {
    flex: 1,
    gap: 2,
  },
  smartEntryTitle: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  smartEntryDesc: {
    ...typography['body-sm'],
  },
  smartInput: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 96,
    fontSize: 15,
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
  // Swipe Actions（P16 决策 8）
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  swipeBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minWidth: 68,
  },
  swipeBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Address Card
  addressCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
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
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tagChip: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '700',
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
