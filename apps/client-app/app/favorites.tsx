// FavoriteListPage — 收藏列表（P19：原型 第四梯队HTML原型设计/P18-P19 优化原型）
// D.12: PrimaryHeader + 网格/列表视图切换 + 批量管理 + 空状态
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ProductCard } from '@/components/business/ProductCard';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useFavorites, useRemoveFavorites } from '@/services/queries/useFavorites';
import { useAddToCart } from '@/services/queries/useCart';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import type { Product } from '@/types';

// Why: 视图偏好持久化（P19 D2），键名对齐现有 meimart.recentSearches / meimart.locale 风格
const VIEW_STORAGE_KEY = 'meimart.favorites.view';
type FavoritesView = 'grid' | 'list';

export default function FavoritesPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: favorites, isLoading, isError, refetch } = useFavorites();
  const removeFavorites = useRemoveFavorites();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Why: 持久化读取放 effect（首帧渲染 'grid' 默认，读到偏好后切换，避免 hydration 闪烁）
  const [view, setView] = useState<FavoritesView>('grid');

  useEffect(() => {
    AsyncStorage.getItem(VIEW_STORAGE_KEY)
      .then((v) => {
        if (v === 'grid' || v === 'list') setView(v);
      })
      .catch(() => {
        // 读取失败保持默认网格，不阻塞页面
      });
  }, []);

  const switchView = (next: FavoritesView) => {
    setView(next);
    AsyncStorage.setItem(VIEW_STORAGE_KEY, next).catch(() => {});
  };

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

  // Why: 真实批量删除（P19 D1）—— 并行 toggle + 乐观移除；成功 toast + 退出选择，
  //      失败 hook onError 已回滚 cache，这里保留选择集合供重试
  const executeRemove = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    removeFavorites.mutate(ids, {
      onSuccess: () => {
        toast.success(t('favorites.removed', { defaultValue: 'Removed from favorites' }));
        exitSelectMode();
      },
      onError: () => {
        toast.error(t('favorites.removeFailed', { defaultValue: 'Failed to remove, please retry' }));
      },
    });
  };

  const removeSelected = () => {
    if (selected.size === 0 || removeFavorites.isPending) return;
    // Why: Web 端 Alert 不显示，直接执行；Native 端用 Alert 确认
    if (Platform.OS === 'web') {
      executeRemove();
      return;
    }
    Alert.alert(
      t('favorites.removeTitle', { defaultValue: 'Remove Favorites' }),
      t('favorites.removeConfirm', {
        count: selected.size,
        defaultValue: `Remove ${selected.size} item(s) from favorites?`,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: executeRemove,
        },
      ],
    );
  };

  const onLongPress = (id: string) => {
    setSelectMode(true);
    toggleSelect(id);
  };

  // Why: 列表态快速加购（P19 D4）—— useAddToCart 自带乐观更新；收藏摘要无 stock 字段，
  //      SOLD_OUT/STOCK_EXCEEDED/无 SKU 的失败统一走 onError toast（无库存/网络兜底）
  const addToCart = useAddToCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const handleQuickAdd = (item: Product) => {
    if (addingId) return; // 同一时间只允许一个加购请求（防重复提交）
    setAddingId(item.id);
    addToCart.mutate(
      { product: item, quantity: 1 },
      {
        onSuccess: () => {
          toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' }));
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : '';
          const friendly =
            msg === 'SOLD_OUT'
              ? t('product.soldOut', { defaultValue: 'Sold Out' })
              : msg === 'STOCK_EXCEEDED'
                ? t('cart.stockExceeded', { defaultValue: 'Not enough stock' })
                : getApiErrorMessage(err, t('product.addToCartFailed', { defaultValue: 'Failed to add to cart' }));
          toast.error(friendly);
        },
        onSettled: () => setAddingId(null),
      },
    );
  };

  const HeaderRight = selectMode ? (
    <View style={styles.headerActions}>
      <Pressable
        onPress={exitSelectMode}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('favorites.a11y.cancelSelect')}
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
      accessibilityLabel={t('favorites.a11y.manage')}
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
        onBackPress={selectMode ? exitSelectMode : handleBack}
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
            accessibilityLabel={t('common.selectAll')}
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
            disabled={selected.size === 0 || removeFavorites.isPending}
            style={({ pressed }) => [
              styles.manageBarDelete,
              {
                backgroundColor:
                  selected.size === 0 || removeFavorites.isPending
                    ? colors['outline-variant']
                    : colors.error,
                opacity: selected.size === 0 || removeFavorites.isPending ? 0.5 : 1,
              },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
            accessibilityState={
              selected.size === 0 || removeFavorites.isPending ? { disabled: true } : undefined
            }
            testID="favorites-batch-delete"
          >
            <Icon symbol="delete" size={18} color="#ffffff" />
            <Text style={styles.manageBarDeleteText}>
              {t('common.delete')} ({selected.size})
            </Text>
          </Pressable>
        </View>
      )}

      {/* 工具栏（原型 fav-tools）：左计数 · 右网格/列表切换；管理态隐藏（选择优先） */}
      {!selectMode && favorites && favorites.length > 0 && (
        <View style={styles.toolsBar}>
          <View style={styles.toolsCount}>
            <Icon symbol="favorite" size={13} color={colors.primary} />
            <Text style={[styles.toolsCountText, { color: colors['on-surface-variant'] }]}>
              {t('favorites.countHint', {
                count: favorites.length,
                defaultValue: `{{count}} item(s) in your favorites`,
              })}
            </Text>
          </View>
          <View
            style={[styles.viewSwitch, { borderColor: colors['outline-variant'] }]}
            accessibilityRole="tablist"
          >
            {(
              [
                { key: 'grid' as FavoritesView, icon: 'grid_view', label: t('favorites.a11y.gridView') },
                { key: 'list' as FavoritesView, icon: 'view_list', label: t('favorites.a11y.listView') },
              ]
            ).map(({ key, icon, label }) => {
              const active = view === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => switchView(key)}
                  style={[
                    styles.viewBtn,
                    { backgroundColor: active ? colors.primary : colors['surface-container-lowest'] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={active ? { selected: true } : undefined}
                  testID={`favorites-view-${key}`}
                >
                  <Icon symbol={icon} size={18} color={active ? '#ffffff' : colors['on-surface-variant']} />
                </Pressable>
              );
            })}
          </View>
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
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          // Why: 网格 2 列 / 列表 1 列（P19 D2）—— 视图切换时 numColumns 变化需重建列表，
          //      extraData 驱动 re-render（RN numColumns 不可运行时热切换 key 才稳妥）
          key={view}
          numColumns={view === 'grid' ? 2 : 1}
          columnWrapperStyle={view === 'grid' ? styles.row : undefined}
          contentContainerStyle={view === 'grid' ? styles.list : styles.listStack}
          renderItem={({ item }: { item: Product }) => {
            const isSelected = selected.has(item.id);
            if (view === 'list' && !selectMode) {
              // 列表常态（P19 D2）：复用 HorizontalProductCard —— 72px 图 + 名称/价格/销量 + 32px 圆形加购
              return (
                <HorizontalProductCard
                  product={item}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onAddToCart={() => handleQuickAdd(item)}
                  addPending={addingId === item.id}
                />
              );
            }
            return (
              <View style={view === 'grid' ? styles.cell : styles.listCell}>
                {selectMode && (
                  <View
                    style={[
                      styles.selectBadge,
                      {
                        backgroundColor: isSelected ? colors.primary : colors['surface-container-lowest'],
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
                  {view === 'grid' ? (
                    <View style={shadowPresets.sm}>
                      <ProductCard product={item} />
                    </View>
                  ) : (
                    // 管理态列表视图：HPC 无选择语义，统一降级用 ProductCard 结构同网格（简化）
                    <View style={shadowPresets.sm}>
                      <ProductCard product={item} />
                    </View>
                  )}
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
    paddingHorizontal: layout['container-margin'],
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
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.sm,
  },
  hintText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  toolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.xs,
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
  list: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  listStack: {
    padding: layout['container-margin'],
    gap: spacing.sm + 2,
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
  listCell: {
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
