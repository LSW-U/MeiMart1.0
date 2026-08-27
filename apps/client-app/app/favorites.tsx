// FavoriteListPage — 收藏列表（P19：原型 第四梯队HTML原型设计/P18-P19 优化原型）
// D.12: PrimaryHeader + 视图切换 + 批量管理 + 空状态
// 网格常态：两列瀑布流（MasonryProductCard，与 home/search 统一）；列表态：HorizontalProductCard；
// 管理态：降级对齐网格 FlatList + ProductCard（选择徽章位）
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ScrollView,
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
import { MasonryProductCard } from '@/components/business/MasonryProductCard/MasonryProductCard';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useFavorites, useRemoveFavorites } from '@/services/queries/useFavorites';
import { useAddToCart } from '@/services/queries/useCart';
import { useAuthStore } from '@/store/authStore';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Product } from '@/types';

// Why: 视图偏好持久化（P19 D2），键名对齐现有 meimart.recentSearches / meimart.locale 风格
const VIEW_STORAGE_KEY = 'meimart.favorites.view';
type FavoritesView = 'grid' | 'list';

export default function FavoritesPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: favorites, isLoading, isError, refetch } = useFavorites();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isOffline } = useWeakNetworkUI();
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

  // Why: 真实批量删除（P19 D1 + 审查 Q2）—— 并行 toggle + 乐观移除；allSettled 局部回滚：
  //      失败项 hook 已加回 cache，这里按结果分流 toast；失败时选择集合只保留失败项可重试
  const executeRemove = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    removeFavorites.mutate(ids, {
      onSuccess: ({ failedIds, okCount }) => {
        if (failedIds.length === 0) {
          toast.success(t('favorites.removed', { defaultValue: 'Removed from favorites' }));
          exitSelectMode();
          return;
        }
        if (okCount > 0) {
          toast.error(
            t('favorites.partiallyRemoved', {
              count: okCount,
              defaultValue: '{{count}} item(s) removed, some failed — please retry',
            }),
          );
        } else {
          toast.error(
            t('favorites.removeFailed', { defaultValue: 'Failed to remove, please retry' }),
          );
        }
        // 只保留失败项为选中态（成功项已移除，重试不会反向加回）
        setSelected(new Set(failedIds));
      },
      onError: () => {
        toast.error(
          t('favorites.removeFailed', { defaultValue: 'Failed to remove, please retry' }),
        );
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
                ? t('product.stockExceeded')
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
        <Text style={[styles.headerActionText, { color: colors['on-primary'] }]}>
          {t('common.cancel')}
        </Text>
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
      <Icon symbol="edit" size={22} color={colors['on-primary']} />
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
            <Icon symbol="delete" size={18} color={colors['on-primary']} />
            <Text style={[styles.manageBarDeleteText, { color: colors['on-primary'] }]}>
              {t('common.delete')} ({selected.size})
            </Text>
          </Pressable>
        </View>
      )}

      {/* Q5 stale 态（规则 10）：离线时 offlineFirst 返回缓存，用 OfflineBanner 提示数据可能过期 */}
      {isOffline && !isLoading && !isError && <OfflineBanner onRetry={() => refetch()} />}

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
                  <Icon symbol={icon} size={18} color={active ? colors['on-primary'] : colors['on-surface-variant']} />
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
        // P19 D6：未登录 → 登录引导（useFavorites enabled=false 落空态但不该引导去逛逛）；
        //        已登录无数据 → 去逛逛
        !isAuthenticated ? (
          <EmptyState
            title={t('favorites.loginTitle')}
            description={t('favorites.loginDesc')}
            icon="favorite-border"
            actionLabel={t('profile.loginRegister')}
            onAction={() => router.replace('/(auth)/login')}
          />
        ) : (
          <EmptyState
            title={t('favorites.empty')}
            description={t('favorites.emptyDesc')}
            icon="favorite-border"
            actionLabel={t('favorites.goBrowse', { defaultValue: 'Browse Products' })}
            onAction={() => router.push('/(main)/home')}
          />
        )
      ) : selectMode ? (
        // 管理态降级：对齐网格 FlatList + ProductCard（选择徽章 + 勾选边框 + 长按进管理态仍在）；
        // 瀑布流卡片无徽章位，管理交互优先于视觉统一 —— 同 P19「列表视图管理态降级」决策
        <FlatList
          data={favorites}
          // Why: 管理态勾选依赖 selected，不传 extraData 则已渲染 cell 不重执行 renderItem，
          //      勾选对勾不刷新（审查 Q1 CONFIRMED，管理态核心交互失效）
          extraData={selected}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          key="manage-grid"
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Product }) => {
            const isSelected = selected.has(item.id);
            return (
              <View style={styles.cell}>
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
                    color={isSelected ? colors['on-primary'] : colors['on-surface-variant']}
                  />
                </View>
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  onLongPress={() => onLongPress(item.id)}
                  style={({ pressed }) => [
                    styles.cardWrapper,
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
      ) : view === 'list' ? (
        // 列表态：单列 FlatList + HorizontalProductCard（P19 D2：72px 图 + 名称/价格/销量 + 32px 圆形加购）
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          key="list"
          contentContainerStyle={styles.listStack}
          renderItem={({ item }: { item: Product }) => (
            <HorizontalProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
              onAddToCart={() => handleQuickAdd(item)}
              // Q4：spinner 只在发起卡；单飞行期间其他卡 disabled（点按不再静默丢弃）
              addPending={addingId === item.id}
              addDisabled={addingId !== null && addingId !== item.id}
              testID={`favorites-hpc-${item.id}`}
            />
          )}
        />
      ) : (
        // 网格常态：两列瀑布流（复用 home/search 的 MasonryProductCard 奇偶分列模式，高度档位错落）
        // Why: 收藏数通常 < 100，ScrollView 全量渲染可接受（home/search 同款取舍）
        <ScrollView contentContainerStyle={styles.masonryContent}>
          <View style={styles.masonryRow}>
            <View style={styles.masonryCol}>
              {favorites.map((item, i) => i % 2 === 0 && (
                <MasonryProductCard
                  key={item.id}
                  product={item}
                  badge={resolveBadges(item, t)[0]}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onLongPress={() => onLongPress(item.id)}
                  onAddToCart={() => handleQuickAdd(item)}
                  testID={`favorites-masonry-${item.id}`}
                />
              ))}
            </View>
            <View style={styles.masonryCol}>
              {favorites.map((item, i) => i % 2 === 1 && (
                <MasonryProductCard
                  key={item.id}
                  product={item}
                  badge={resolveBadges(item, t)[0]}
                  onPress={() => router.push(`/product/${item.id}`)}
                  onLongPress={() => onLongPress(item.id)}
                  onAddToCart={() => handleQuickAdd(item)}
                  testID={`favorites-masonry-${item.id}`}
                />
              ))}
            </View>
          </View>
        </ScrollView>
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
    // Why: on-primary 运行时注入（styles 模块级拿不到 colors；header 红底白字）
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
    // Why: on-primary 运行时注入（error 红底白字，同上）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
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
    position: 'relative',
  },
  // 网格常态瀑布流容器（同 home.tsx masonryRow/masonryCol 模式）
  masonryContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  masonryCol: {
    flex: 1,
    gap: spacing.md,
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
