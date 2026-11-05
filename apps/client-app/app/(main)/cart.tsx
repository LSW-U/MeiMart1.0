// CartPage — 还原自 CartPage.html（358 行）
// HTML → RN 行数比：358 → ~440（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 123%）
// Fix-19: Primary tais-pattern Header + 商品缩略图 + TaisDivider + You May Also Like + Checkout Bar
// 业务增强批3 拆分（1.1）：页面壳 + cart/sections/{ItemsSection,BottomBar} + cart/shared.tsx——
//   ON_PRIMARY 抽 shared，ItemsSection（顶部操作行+商品列表+TaisDivider+推荐区）与
//   BottomBar（管理态删除栏/结算栏）抽 sections；主文件保留路由壳 + 数据组装 + 状态管理，
//   行为零变更（纯搬移，先例：order/[id].tsx 批5 拆分同款模式）。
// 行数比例（规则28）：拆分后壳 228 + ItemsSection 335 + BottomBar 220 = 783 ≥ HTML 358×30%。
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { toast } from '@/store/toastStore';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { Icon } from '@/components/ui/Icon';
import {
  useCart,
  useRemoveCartItem,
  useRemoveCartItems,
  useToggleCartItem,
  useToggleCartItems,
} from '@/services/queries/useCart';
import { useCoupons } from '@/services/queries/usePromotion';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import type { CartItem } from '@/types';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';
import { ON_PRIMARY } from '../cart/shared';
import { ItemsSection } from '../cart/sections/ItemsSection';
import { BottomBar } from '../cart/sections/BottomBar';

export default function CartPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useWeakNetworkUI();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const { data: coupons } = useCoupons();
  const removeMutation = useRemoveCartItem();
  // C-P2-8: 批量删收敛为单次 mutation（原 forEach 逐 id mutate：N 次 DELETE + N 次 getCart 竞态）
  const removeItemsMutation = useRemoveCartItems();
  const toggleMutation = useToggleCartItem();
  // P1-2（审查拍板）：RQ v5 的 useMutation result 对象每渲染新引用，不能进 useCallback deps；
  //   解构出 mutate（RQ 内部稳定绑定）供 makeRow* 工厂依赖。removeMutation 供 removeOne 用（同款收口）。
  const { mutate: toggleMutate } = toggleMutation;

  const isEmpty = !cart || cart.items.length === 0;
  const allSelected = !isEmpty && cart.items.every((i) => i.selected);
  const totalPrice = cart?.totalPrice ?? 0;
  const totalItems = cart?.totalItems ?? 0;
  const couponCount = (coupons ?? []).length; // §5.1 可用优惠券计数（ClientCoupon 全 available）
  const discountAmount = cart?.discountAmount ?? 0; // V5 已应用券折扣（后端有值才显示 DISCOUNT 行）

  // §4 管理模式 state（批量删除替代单个 trash 按钮）
  const [manageMode, setManageMode] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());

  // 第四轮批4 P3：全选/全不选收敛为单次批量 mutation（原 forEach 逐项 mutate：N 次 PATCH
  // + N 次 getCart 竞态）。目标项 = 选中态与目标相反的项（与原过滤语义一致）。
  const toggleAllTargets = useMemo(
    () => cart?.items.filter((i) => i.selected === allSelected).map((i) => i.id) ?? [],
    [cart, allSelected],
  );
  const toggleAllMutation = useToggleCartItems();
  const toggleAll = useCallback(() => {
    if (toggleAllTargets.length === 0) return;
    toggleAllMutation.mutate({ itemIds: toggleAllTargets, selected: !allSelected });
  }, [toggleAllTargets, allSelected, toggleAllMutation]);

  // 管理态全选：checkbox 勾选 = 全部加入 selectedForDelete，取消 = 清空
  const allForDelete =
    !isEmpty && cart.items.length > 0 && cart.items.every((i) => selectedForDelete.has(i.id));
  const toggleAllForDelete = () => {
    setSelectedForDelete(allForDelete ? new Set() : new Set((cart?.items ?? []).map((i) => i.id)));
  };

  // §4.2 管理态：checkbox 切删除选中（selectedForDelete），与结算选中 item.selected 解耦
  // Why: 批3 A7 / A-P2-3 (D5) —— CartItemRow/SmallProductCard 均为 React.memo，回调 useCallback 稳定引用
  const toggleDeleteSelect = useCallback((item: CartItem) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);
  const enterManage = useCallback(() => {
    setSelectedForDelete(new Set());
    setManageMode(true);
  }, []);
  const exitManage = useCallback(() => {
    setSelectedForDelete(new Set());
    setManageMode(false);
  }, []);

  // 管理态单个删除（卡片最右侧 trash）：直删 + toast，同步从 selectedForDelete 移除
  // P1-2 同款收口：deps 用解构出的 removeMutate（mutation result 对象每渲染新引用）
  const { mutate: removeMutate } = removeMutation;
  const removeOne = useCallback(
    (item: CartItem) => {
      removeMutate(item.id);
      setSelectedForDelete((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.success(t('cart.removed', { defaultValue: 'Removed' }));
    },
    [removeMutate, t],
  );

  // §5.3 批量删除：C-P2-8 收敛为单次 useRemoveCartItems mutation（一次 DELETE 序列 +
  //   一次 getCart + 一次乐观更新/invalidate，原逐 id mutate 有 N 次竞态）；复用 Alert 确认
  const deleteSelected = () => {
    const count = selectedForDelete.size;
    if (count === 0) return;
    const ids = Array.from(selectedForDelete);
    const doDelete = () => {
      removeItemsMutation.mutate(ids);
      setSelectedForDelete(new Set());
      setManageMode(false);
      toast.success(t('cart.removed', { defaultValue: 'Removed' }));
    };
    if (Platform.OS === 'web') {
      doDelete();
      return;
    }
    Alert.alert(t('cart.removeTitle'), t('cart.deleteConfirm', { count }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('cart.deleteSelected'), style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <PageErrorBoundary pageName="cart">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('tabs.cart')}
          showLocation
          locationLabel={t('home.locationLabel')}
          onLocationPress={() => router.push('/address/map')}
          rightActions={
            <Pressable
              onPress={() => router.push('/search')}
              hitSlop={8}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel={t('common.search')}
            >
              <Icon symbol="search" size={24} color={ON_PRIMARY} />
            </Pressable>
          }
        />

        {isOffline && <OfflineBanner />}
        {/* 批2 阶段2（D8 审计）：loading 位换 PageSkeleton(list)，只换组件不动结构 */}
        {isLoading ? (
          <PageSkeleton variant="list" rows={5} />
        ) : isError ? (
          // T2-B: 401 已由全局 QueryCache onError → clearAuth → RootAuthGate 跳登录兜底（queryClient.ts），
          // 此处只处理非 401 错误（500/网络）
          <ErrorState message={t('errors.cart')} onRetry={() => refetch()} />
        ) : isEmpty ? (
          <View style={styles.emptyBox}>
            <EmptyState
              title={t('cart.empty')}
              description={t('cart.emptyDesc')}
              icon="cart-outline"
              actionLabel={t('favorites.goBrowse')}
              onAction={() => router.push('/(main)/home')}
            />
          </View>
        ) : (
          <ItemsSection
            manageMode={manageMode}
            cart={cart}
            couponCount={couponCount}
            selectedForDelete={selectedForDelete}
            enterManage={enterManage}
            exitManage={exitManage}
            toggleDeleteSelect={toggleDeleteSelect}
            removeOne={removeOne}
            toggleMutate={toggleMutate}
          />
        )}

        {/* 底部栏：管理态显删除栏（§4.3），默认显结算栏（§3.4 锁定，仅去 discount 行） */}
        {!isEmpty && (
          <BottomBar
            manageMode={manageMode}
            allForDelete={allForDelete}
            toggleAllForDelete={toggleAllForDelete}
            deleteSelected={deleteSelected}
            selectedCount={selectedForDelete.size}
            allSelected={allSelected}
            toggleAll={toggleAll}
            totalPrice={totalPrice}
            discountAmount={discountAmount}
            totalItems={totalItems}
            isOffline={isOffline}
          />
        )}
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
  },
});
