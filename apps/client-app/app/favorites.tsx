// ⚠️ 无 HTML 原型，参考 ProductListPage 推导实现，待设计确认
// FavoriteListPage — 收藏列表（参考 ProductListPage.html 的商品网格）
// D.12: PrimaryHeader + 2 列商品网格 + 批量管理 + 空状态
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useFavorites } from '@/services/queries/useFavorites';
import type { Product } from '@/types';

export default function FavoritesPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: favorites, isLoading, isError, refetch } = useFavorites();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const removeSelected = () => {
    if (selected.size === 0) return;
    Alert.alert(
      t('favorites.removeTitle', { defaultValue: 'Remove Favorites' }),
      t('favorites.removeConfirm', {
        defaultValue: `Remove ${selected.size} item(s) from favorites? (mock)`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            // TODO: 接入 useRemoveFavorite mutation（API 待实现）
            exitSelectMode();
          },
        },
      ],
    );
  };

  const onLongPress = (id: string) => {
    setSelectMode(true);
    toggleSelect(id);
  };

  const HeaderRight = selectMode ? (
    <View style={styles.headerActions}>
      <Pressable
        onPress={exitSelectMode}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cancel select"
      >
        <Text style={styles.headerActionText}>{t('common.cancel')}</Text>
      </Pressable>
    </View>
  ) : (
    <Pressable
      onPress={() => setSelectMode(true)}
      hitSlop={8}
      style={styles.headerBtn}
      accessibilityRole="button"
      accessibilityLabel="Manage favorites"
      testID="favorites-manage"
    >
      <Icon symbol="edit" size={22} color="#ffffff" />
    </Pressable>
  );

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={
          selectMode
            ? t('favorites.selectedTitle', {
                defaultValue: `Selected ${selected.size}`,
              })
            : t('favorites.title')
        }
        showBack
        onBackPress={selectMode ? exitSelectMode : () => router.back()}
        rightActions={HeaderRight}
      />

      {selectMode && (
        <View
          style={[
            styles.manageBar,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderBottomColor: colors['outline-variant'],
            },
          ]}
        >
          <Pressable
            onPress={() => {
              if (!favorites) return;
              const all = new Set(favorites.map((f) => f.id));
              setSelected(selected.size === favorites.length ? new Set() : all);
            }}
            style={styles.manageBarBtn}
            accessibilityRole="button"
            accessibilityLabel="Select all"
          >
            <Icon
              symbol={
                favorites && selected.size === favorites.length
                  ? 'check_circle'
                  : 'radio_button_unchecked'
              }
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.manageBarText, { color: colors['on-surface'] }]}>
              {t('common.all')}
            </Text>
          </Pressable>

          <Pressable
            onPress={removeSelected}
            disabled={selected.size === 0}
            style={({ pressed }) => [
              styles.manageBarDelete,
              {
                backgroundColor: selected.size === 0 ? colors['outline-variant'] : colors.error,
                opacity: selected.size === 0 ? 0.5 : 1,
              },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            testID="favorites-batch-delete"
          >
            <Icon symbol="delete" size={18} color="#ffffff" />
            <Text style={styles.manageBarDeleteText}>
              {t('common.delete')} ({selected.size})
            </Text>
          </Pressable>
        </View>
      )}

      {/* 提示信息条 */}
      {!selectMode && favorites && favorites.length > 0 && (
        <View style={[styles.hintBar, { backgroundColor: colors['surface-container-low'] }]}>
          <Icon symbol="favorite" size={14} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors['on-surface-variant'] }]}>
            {t('favorites.countHint', {
              defaultValue: `${favorites.length} item(s) in your favorites`,
            })}
            {' · '}
            {t('favorites.longPressHint', { defaultValue: 'Long-press to manage' })}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <ErrorState message={t('favorites.loadError')} onRetry={() => refetch()} />
      ) : !favorites || favorites.length === 0 ? (
        <EmptyState
          title={t('favorites.empty')}
          description={t('favorites.emptyDesc')}
          icon="favorite-border"
          actionLabel={t('favorites.goBrowse', { defaultValue: 'Browse Products' })}
          onAction={() => router.push('/(main)/home')}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Product }) => {
            const isSelected = selected.has(item.id);
            return (
              <View style={styles.cell}>
                {selectMode && (
                  <View
                    style={[
                      styles.selectBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : 'rgba(255,255,255,0.9)',
                        borderColor: isSelected ? colors.primary : colors['outline-variant'],
                      },
                      shadowPresets.sm,
                    ]}
                  >
                    <Icon
                      symbol={isSelected ? 'check' : 'radio_button_unchecked'}
                      size={14}
                      color={isSelected ? '#ffffff' : colors['on-surface-variant']}
                    />
                  </View>
                )}
                <Pressable
                  onPress={() =>
                    selectMode ? toggleSelect(item.id) : router.push(`/product/${item.id}`)
                  }
                  onLongPress={() => onLongPress(item.id)}
                  style={({ pressed }) => [
                    styles.cardWrapper,
                    selectMode &&
                      isSelected && [styles.selectedCell, { borderColor: colors.primary }],
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={shadowPresets.sm}>
                    <ProductCard product={item} />
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionText: {
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
  manageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['container-margin'],
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing['container-margin'],
    paddingVertical: spacing.sm,
  },
  hintText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  list: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
    position: 'relative',
  },
  cardWrapper: {
    borderRadius: borderRadius.xl,
  },
  selectedCell: {
    borderWidth: 2,
    borderRadius: borderRadius.xl,
  },
  selectBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
