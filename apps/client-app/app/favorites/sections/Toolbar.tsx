// 收藏页工具栏（业务增强批3 拆分：从 app/favorites.tsx 原样搬移，行为零变更）
// 原型 fav-tools：左计数 · 右网格/列表切换；管理态不渲染（调用方守卫）
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { FavoritesView } from '../shared';

export function FavoritesToolbar({
  count,
  view,
  switchView,
}: {
  count: number;
  view: FavoritesView;
  switchView: (next: FavoritesView) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.toolsBar}>
      <View style={styles.toolsCount}>
        <Icon symbol="favorite" size={13} color={colors.primary} />
        <Text style={[styles.toolsCountText, { color: colors['on-surface-variant'] }]}>
          {t('favorites.countHint', {
            count,
            defaultValue: `{{count}} item(s) in your favorites`,
          })}
        </Text>
      </View>
      <View
        style={[styles.viewSwitch, { borderColor: colors['outline-variant'] }]}
        accessibilityRole="tablist"
      >
        {[
          {
            key: 'grid' as FavoritesView,
            icon: 'grid_view',
            label: t('favorites.a11y.gridView'),
          },
          {
            key: 'list' as FavoritesView,
            icon: 'view_list',
            label: t('favorites.a11y.listView'),
          },
        ].map(({ key, icon, label }) => {
          const active = view === key;
          return (
            <Pressable
              key={key}
              onPress={() => switchView(key)}
              style={[
                styles.viewBtn,
                {
                  backgroundColor: active ? colors.primary : colors['surface-container-lowest'],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={active ? { selected: true } : undefined}
              testID={`favorites-view-${key}`}
            >
              <Icon
                symbol={icon}
                size={18}
                color={active ? colors['on-primary'] : colors['on-surface-variant']}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    // Why: 距 PrimaryHeader 太近（用户反馈），xs(4) → 10 → 16（spacing.md，再上调一档看效果）
    paddingVertical: spacing.md,
  },
  toolsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolsCountText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  viewSwitch: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  viewBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
