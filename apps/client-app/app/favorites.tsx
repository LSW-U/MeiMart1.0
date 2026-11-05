// FavoriteListPage — 收藏列表（P19：原型 第四梯队HTML原型设计/P18-P19 优化原型）
// D.12: PrimaryHeader + 视图切换 + 批量管理 + 空状态
// 网格态：两列瀑布流（MasonryProductCard，与 home/search 统一）；列表态：HorizontalProductCard；
// 管理态跟随当前视图（D7）：卡片原地变选择态，不切换卡片组件
// 业务增强批3 拆分（1.1）：页面壳 + favorites/sections/{Toolbar,ManageBar} + favorites/shared.tsx——
//   工具栏（计数+视图切换）与底部管理栏（全选+删除）抽 sections，VIEW_STORAGE_KEY 抽 shared；
//   主文件保留路由壳 + 数据组装 + 列表/网格渲染，行为零变更（纯搬移，先例：order/[id].tsx 批5 同款）。
// 行数比例（规则28）：壳 426 + Toolbar 106 + ManageBar 115 = 647 ≥ 30% 门槛（FavoriteListPage.html 为 0 字节空文件，规则 31 已登记 docs/empty-html-files.md，无比例基线，对齐 P19 实施时口径）。
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, FlatList, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
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
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Product } from '@/types';
import { VIEW_STORAGE_KEY, type FavoritesView } from './favorites/shared';
import { FavoritesToolbar } from './favorites/sections/Toolbar';
import { ManageBar } from './favorites/sections/ManageBar';

export default function FavoritesPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: favorites, isLoading, isError, refetch } = useFavorites();
  // Why: 1.2 虚拟化（业务增强批2，P-v2-2 分列行化）：商品组装成「行数组」
  //   （每行 = 左右各一张卡的容器）喂 FlatList numColumns=1——真虚拟化
  //   （ScrollView 全量渲染退役，offset-infinite-exceptions.md 红线已摘登记）。
  // 20261105 改版（方案甲，用户拍板）：瀑布流错落 → 左右对称等高网格——
  //   用户两轮实测（4/6 个收藏）瀑布流行化后行距呆板/挤在一起（错落三档在小数据量下
  //   节奏随机，交错配对救不了），拍板放弃错落改对称：每行左右两卡等高
  //   （uniformImageHeight=168 固定中档），行距统一 spacing.md。
  //   虚拟化保留：仍行化喂 FlatList numColumns=1（行 = 左右对半两卡容器），
  //   offset-infinite-exceptions.md 口径不变（FlatList 真虚拟化）。
  //   ⚠️ splitMasonryBalanced/高矮交错配对已删（对称网格不需要分列算法）。
  const UNIFORM_IMAGE_HEIGHT = 168;
  const masonryRows = useMemo(() => {
    const rows: { left?: Product; right?: Product }[] = [];
    const items = favorites ?? [];
    for (let i = 0; i < items.length; i += 2) {
      rows.push({ left: items[i], right: items[i + 1] });
    }
    return rows;
  }, [favorites]);
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

  // Why: 批3 A7 —— 卡片组件均为 React.memo，回调一律 useCallback 稳定引用（防 memo 浅比较失效）
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

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

  const onLongPress = useCallback(
    (id: string) => {
      setSelectMode(true);
      toggleSelect(id);
    },
    [toggleSelect],
  );

  // Why: 列表态快速加购（P19 D4）—— useAddToCart 自带乐观更新；收藏摘要无 stock 字段，
  //      SOLD_OUT/STOCK_EXCEEDED/无 SKU 的失败统一走 onError toast（无库存/网络兜底）
  const addToCart = useAddToCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const handleQuickAdd = useCallback(
    (item: Product) => {
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
                  : getApiErrorMessage(
                      err,
                      t('product.addToCartFailed', { defaultValue: 'Failed to add to cart' }),
                    );
            toast.error(friendly);
          },
          onSettled: () => setAddingId(null),
        },
      );
    },
    [addingId, addToCart, t],
  );

  // Why: 批3 A7 —— FlatList renderItem 用 useCallback（依赖以下稳定回调 + 渲染态值）
  // 批3 P2-2：onPress/onLongPress/onAddToCart 直传稳定 handler（卡片内部调 handler(product)），
  // 消灭调用点内联箭头 → memo 浅比较可命中。selectMode 分流在 handler 内部判定。
  const handleCardPress = useCallback(
    (item: Product) => {
      if (selectMode) toggleSelect(item.id);
      else router.push(`/product/${item.id}`);
    },
    [selectMode, toggleSelect],
  );
  const handleCardLongPress = useCallback((item: Product) => onLongPress(item.id), [onLongPress]);
  const handleCardAdd = useCallback((item: Product) => handleQuickAdd(item), [handleQuickAdd]);

  const renderListItem = useCallback(
    ({ item }: { item: Product }) => (
      <HorizontalProductCard
        product={item}
        onPress={handleCardPress}
        // Why: 长按进管理态（D7），与网格态 Masonry 对称（审查 Q4）
        onLongPress={handleCardLongPress}
        onAddToCart={handleCardAdd}
        badge={selectMode ? undefined : resolveBadges(item, t)[0]}
        selectMode={selectMode}
        isSelected={selected.has(item.id)}
        // Q4：spinner 只在发起卡；单飞行期间其他卡 disabled（点按不再静默丢弃）
        addPending={addingId === item.id}
        addDisabled={addingId !== null && addingId !== item.id}
        testID={`favorites-hpc-${item.id}`}
      />
    ),
    [handleCardPress, handleCardLongPress, handleCardAdd, selectMode, selected, addingId, t],
  );

  // Why: 批3 P2-2 —— 网格态卡片同样直传稳定 handler（上三个 useCallback）；
  // resolveBadges(item,t) 是渲染期派生值逐项不同，不影响回调引用稳定性
  const renderMasonryItem = useCallback(
    (item: Product) => (
      <MasonryProductCard
        key={item.id}
        product={item}
        badge={selectMode ? undefined : resolveBadges(item, t)[0]}
        onPress={handleCardPress}
        onLongPress={handleCardLongPress}
        onAddToCart={handleCardAdd}
        selectMode={selectMode}
        isSelected={selected.has(item.id)}
        uniformImageHeight={UNIFORM_IMAGE_HEIGHT}
        testID={`favorites-masonry-${item.id}`}
      />
    ),
    [handleCardPress, handleCardLongPress, handleCardAdd, selectMode, selected, t],
  );

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
            ? // Why: locales 已有 selectedTitle: "Selected {{count}}"，必须传 count 插值；
              //      只传 defaultValue 会被忽略（key 存在时 defaultValue 不生效）→ 显示原始 {{count}}
              t('favorites.selectedTitle', { count: selected.size })
            : t('favorites.title')
        }
        showBack
        onBackPress={selectMode ? exitSelectMode : handleBack}
        rightActions={HeaderRight}
      />

      {/* Q5 stale 态（规则 10）：离线时 offlineFirst 返回缓存，用 OfflineBanner 提示数据可能过期 */}
      {isOffline && !isLoading && !isError && <OfflineBanner onRetry={() => refetch()} />}

      {/* 工具栏（原型 fav-tools）：左计数 · 右网格/列表切换；管理态隐藏（选择优先） */}
      {!selectMode && favorites && favorites.length > 0 && (
        <FavoritesToolbar count={favorites.length} view={view} switchView={switchView} />
      )}

      {/* 批2 阶段2（D8 审计）：loading spinner 换 PageSkeleton(list)，只换组件不动结构 */}
      {isLoading ? (
        <PageSkeleton variant="list" rows={5} />
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
      ) : view === 'list' ? (
        // 列表态：单列 FlatList + HorizontalProductCard（P19 D2：72px 图 + 名称/价格/销量 + 32px 圆形加购）
        // 管理态跟随视图（D7「网格和列表都可进入管理」）：卡片原地变选择态（右侧加购位换选择圆圈）
        <FlatList
          data={favorites}
          // Why: 管理态勾选依赖 selected，不传 extraData 则已渲染 cell 不重执行 renderItem，
          //      勾选圆圈不刷新（审查 Q1 CONFIRMED，管理态核心交互失效）
          extraData={selected}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          key="list"
          contentContainerStyle={[styles.listStack, selectMode && styles.listManage]}
          renderItem={renderListItem}
        />
      ) : (
        // 网格态：两列瀑布流 → 分列行化喂单列 FlatList（1.2 虚拟化，P-v2-2）：
        // 每行渲染左右两张 MasonryProductCard（列短时一侧可空），行级虚拟化回收不可视行；
        // 管理态跟随视图原地变选择态（右上角 select-circle + 选中红边），不切换卡片组件
        <FlatList
          data={masonryRows}
          keyExtractor={(row, idx) =>
            `${row.left?.id ?? 'empty'}-${row.right?.id ?? 'empty'}-${idx}`
          }
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          // 管理态勾选依赖 selected（列表态 extraData 同因，审查 Q1）
          extraData={selected}
          key="masonry"
          contentContainerStyle={[styles.masonryContent, selectMode && styles.listManage]}
          renderItem={({ item: row }) => (
            <View style={styles.masonryRow}>
              <View style={styles.masonryCol}>{row.left ? renderMasonryItem(row.left) : null}</View>
              <View style={styles.masonryCol}>
                {row.right ? renderMasonryItem(row.right) : null}
              </View>
            </View>
          )}
        />
      )}

      {/* 管理栏底部悬浮：全选 + 删除（抽 ManageBar section，本批 1.1 拆分） */}
      {selectMode && favorites && (
        <ManageBar
          selectedCount={selected.size}
          totalCount={favorites.length}
          toggleSelectAll={() => {
            const all = new Set(favorites.map((f) => f.id));
            setSelected(selected.size === favorites.length ? new Set() : all);
          }}
          removeSelected={removeSelected}
          removePending={removeFavorites.isPending}
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
    // Why: on-primary 运行时注入（styles 模块级拿不到 colors；header 红底白字）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 13,
  },
  // 管理态列表：底部悬浮管理栏 ~48px + 间距
  listManage: {
    paddingBottom: spacing.xxl * 2 + 48,
  },
  listStack: {
    padding: layout['container-margin'],
    gap: spacing.sm + 2,
    paddingBottom: spacing.xxl * 2,
  },
  // 网格瀑布流容器（同 home.tsx masonryRow/masonryCol 模式）
  masonryContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  // Why: 行距用 marginBottom 不用 rowGap（FlatList 行容器不消费 gap；先例见 memory 行距坑）；
  // 旧瀑布流行距来自 masonryCol 纵向堆叠 gap，行化后 col 只装单卡，纵向间距必须挂回行容器
  masonryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  masonryCol: {
    flex: 1,
  },
});
