// 收藏页底部管理栏（业务增强批3 拆分：从 app/favorites.tsx 原样搬移，行为零变更）
// 原型 .manage-bar{position:sticky;bottom:0;border-top}：全选 + 批量删除
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';

export function ManageBar({
  selectedCount,
  totalCount,
  toggleSelectAll,
  removeSelected,
  removePending,
}: {
  selectedCount: number;
  totalCount: number;
  toggleSelectAll: () => void;
  removeSelected: () => void;
  removePending: boolean;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const deleteDisabled = selectedCount === 0 || removePending;
  return (
    <View
      style={[
        styles.manageBar,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderTopColor: colors['outline-variant'],
        },
      ]}
    >
      <Pressable
        onPress={toggleSelectAll}
        style={styles.manageBarBtn}
        accessibilityRole="button"
        accessibilityLabel={t('common.selectAll')}
      >
        <Icon
          symbol={allSelected ? 'check_circle' : 'radio_button_unchecked'}
          size={20}
          color={colors.primary}
        />
        <Text style={[styles.manageBarText, { color: colors['on-surface'] }]}>
          {/* Why: 审查 Q2 —— 可见文案与 a11y label（common.selectAll）对齐，原型 :138 是「全选」 */}
          {t('common.selectAll')}
        </Text>
      </Pressable>

      <Pressable
        onPress={removeSelected}
        disabled={deleteDisabled}
        style={({ pressed }) => [
          styles.manageBarDelete,
          {
            backgroundColor: deleteDisabled ? colors['outline-variant'] : colors.error,
            opacity: deleteDisabled ? 0.5 : 1,
          },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('common.delete')}
        accessibilityState={deleteDisabled ? { disabled: true } : undefined}
        testID="favorites-batch-delete"
      >
        <Icon symbol="delete" size={18} color={colors['on-primary']} />
        <Text style={[styles.manageBarDeleteText, { color: colors['on-primary'] }]}>
          {t('common.delete')} ({selectedCount})
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  manageBar: {
    // Why: 底部悬浮（原型 .manage-bar position:sticky bottom:0）——absolute 挂 SafeAreaWrapper
    //      （RN Web View 默认 relative），盖在列表上沿；bottom 0 落在 safe area 内（edges 含 bottom）
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manageBarText: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  manageBarDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  manageBarDeleteText: {
    // Why: on-primary 运行时注入（error 红底白字，同上）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
  },
});
