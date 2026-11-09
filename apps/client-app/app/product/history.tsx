// ProductHistoryPage — 常购清单 + 浏览历史融合页（20261109 拍板 B1）
//
// 前身：app/product/frequently-bought.tsx（常购清单，批3 B1）。
// 融合动机：profile「发现」宫格的浏览历史是纯占位（toast 即将上线，后端无端点），
//   与常购清单同为「我看过/买过的商品」语义，合并为单入口双 tab。
//
// Tab1 常购清单：GET /client/products/buy-again（频次 desc + last_at desc，上限 20）
//   交互原样保留：一键重购加购（三态错误映射）+ 一键加购全部（跳失败项继续）+ guest 空态
// Tab2 浏览历史：纯前端本地（B1 拍板）——详情页 reportProductView 上报，
//   useBrowseHistory AsyncStorage 持久化（上限 50，去重置顶），getProductsByIds 批量取品；
//   已下架/404 自然丢弃；可清空。后端做浏览历史端点后数据源平替。
import { useCallback, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useBrowseHistory } from '@/hooks/useBrowseHistory';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageSkeleton } from '@/components/feedback/PageSkeleton/PageSkeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { HorizontalProductCard } from '@/components/business/HorizontalProductCard/HorizontalProductCard';
import { useBuyAgain, useProductsByIds } from '@/services/queries/useProducts';
import { useAddToCart } from '@/services/queries/useCart';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import { resolveBadges } from '@/utils/resolveBadges';
import { router } from 'expo-router';
import type { Product } from '@/types';

// 红底白字固定（header primary 底），dark 不变（同 product/list ON_PRIMARY 模式）
const ON_PRIMARY = '#ffffff';
// 清单页一次拉全：buy-again 后端上限 20，取满即「全览」
const BUY_AGAIN_PAGE_LIMIT = 20;

type HistoryTab = 'bought' | 'viewed';

export default function ProductHistoryPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // orders 页同款本地 tab 模式（无路由参数直入需求，写死默认常购清单）
  const [active, setActive] = useState<HistoryTab>('bought');

  // —— 常购清单（原 frequently-bought 全量搬入） ——
  // 批3 P2-2 修复：匿名分流——未登录不请求（后端兜底返回销量切片而非「你常买的」，
  //   渲染出来是文案与内容错位），直接渲染 guest 空态引导登录；已登录返回空才显示无记录态
  const {
    data: products,
    isLoading: boughtLoading,
    isError: boughtError,
    refetch: boughtRefetch,
  } = useBuyAgain({
    limit: BUY_AGAIN_PAGE_LIMIT,
    enabled: isAuthenticated && active === 'bought',
  });
  const addMutation = useAddToCart();
  // 一键加购全部进行中标志（防连点）
  const [batchPending, setBatchPending] = useState(false);

  // —— 浏览历史（B1 本地实现） ——
  const {
    entries: historyEntries,
    loaded: historyLoaded,
    clear: clearHistory,
  } = useBrowseHistory();
  // tab 不活跃时不发请求；id 列表稳定排序进 queryKey（useProductsByIds 内部）
  const {
    data: viewedProducts,
    isLoading: viewedLoading,
    isError: viewedError,
    refetch: viewedRefetch,
  } = useProductsByIds(
    historyEntries.map((e) => e.id),
    active === 'viewed',
  );

  const handleClearHistory = useCallback(() => {
    clearHistory();
    toast.success(t('product.historyCleared', { defaultValue: 'History cleared' }));
  }, [clearHistory, t]);

  // Why: 与 product/list handleAdd 同款三态错误映射（第四轮批4 P3 一致口径）
  const handleAdd = useCallback(
    (product: Product) => {
      addMutation.mutate(
        { product, quantity: 1 },
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
        },
      );
    },
    [addMutation, t],
  );

  // 业务增强批1 5.4（方案v2 2026-11-05）：一键加购全部
  // ⚠️ 批量语义与 home 组合购 handleBundleAddAll（任一失败即停）有意区分：
  //    常购清单是多商品批量复购，跳过售罄/超限/网络失败项继续加可用项，
  //    收尾统一结果 toast（全成 / 部分成 X+Y / 全败），不逐条弹错——转化目标优先。
  //    复用 useAddToCart 的 onMutate/onError/onSuccess 三件套（规则 26）。
  const handleAddAll = useCallback(() => {
    if (batchPending || !products || products.length === 0) return;
    setBatchPending(true);
    (async () => {
      let ok = 0;
      let failed = 0;
      for (const item of products) {
        try {
          await addMutation.mutateAsync({ product: item, quantity: 1 });
          ok += 1;
        } catch {
          // 跳过失败项（SOLD_OUT/STOCK_EXCEEDED/网络错）继续加可用项——部分成功不回滚，
          // 缓存一致性由 useAddToCart onMutate 回滚 + onSettled invalidate 校准
          failed += 1;
        }
      }
      if (ok === 0) {
        toast.error(t('home.frequentlyBoughtAllFailed', { defaultValue: 'Failed to add to cart' }));
      } else if (failed > 0) {
        toast.success(
          t('home.frequentlyBoughtPartialAdded', {
            ok,
            failed,
            defaultValue: '{{ok}} added, {{failed}} skipped',
          }),
        );
      } else {
        toast.success(
          t('home.frequentlyBoughtAllAdded', {
            count: ok,
            defaultValue: '{{count}} items added to cart',
          }),
        );
      }
      setBatchPending(false);
    })();
  }, [batchPending, products, addMutation, t]);

  const handleCardPress = useCallback((p: Product) => router.push(`/product/${p.id}`), []);

  const headerTitle = t('home.frequentlyBought');

  const TABS: { key: HistoryTab; label: string }[] = [
    { key: 'bought', label: t('home.frequentlyBought') },
    { key: 'viewed', label: t('product.historyTab', { defaultValue: 'Browsing history' }) },
  ];

  // —— 常购清单 tab 的状态渲染（原 frequently-bought 分支，包 tab 栏同构） ——
  if (active === 'bought') {
    if (boughtLoading) {
      return (
        <SafeAreaWrapper
          edges={['top', 'bottom']}
          style={{ backgroundColor: colors.background, flex: 1 }}
        >
          <StatusBarConfig />
          <Header title={headerTitle} />
          <TabBar tabs={TABS} active={active} onChange={setActive} />
          {/* 批2 阶段2（D8 审计）：loading 遮罩换 PageSkeleton(grid)，只换组件不动结构 */}
          <PageSkeleton variant="grid" />
        </SafeAreaWrapper>
      );
    }
    if (boughtError) {
      return (
        <SafeAreaWrapper
          edges={['top', 'bottom']}
          style={{ backgroundColor: colors.background, flex: 1 }}
        >
          <StatusBarConfig />
          <Header title={headerTitle} />
          <TabBar tabs={TABS} active={active} onChange={setActive} />
          <ErrorState
            message={t('errors.products', { defaultValue: 'Failed to load products' })}
            onRetry={() => boughtRefetch()}
          />
        </SafeAreaWrapper>
      );
    }
    // 批3 P2-2 修复：匿名分流——未登录（不请求，data undefined）直接渲染 guest 空态引导登录；
    //   已登录且返回空才显示「还没有购买记录」态
    if (!isAuthenticated || !products || products.length === 0) {
      return (
        <SafeAreaWrapper
          edges={['top', 'bottom']}
          style={{ backgroundColor: colors.background, flex: 1 }}
        >
          <StatusBarConfig />
          <Header title={headerTitle} />
          <TabBar tabs={TABS} active={active} onChange={setActive} />
          <EmptyState
            title={t('home.frequentlyBoughtEmpty')}
            description={
              isAuthenticated
                ? t('home.frequentlyBoughtEmptyDesc')
                : t('home.frequentlyBoughtEmptyDescGuest')
            }
            icon="history"
            actionLabel={t('home.frequentlyBoughtBrowse')}
            onAction={() => router.push('/product/list')}
          />
        </SafeAreaWrapper>
      );
    }
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <StatusBarConfig />
        <Header title={headerTitle} />
        <TabBar tabs={TABS} active={active} onChange={setActive} />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 排序口径提示（P3-1：频次+最近下单，后端排序前端不重排） */}
          <Text style={[styles.orderHint, { color: colors['on-surface-variant'] }]}>
            {t('home.frequentlyBoughtOrderHint')}
          </Text>
          {/* 业务增强批1 5.4：一键加购全部（进行中禁用防连点） */}
          <Pressable
            testID="fb-add-all"
            onPress={handleAddAll}
            disabled={batchPending}
            style={({ pressed }) => [
              styles.addAllBtn,
              { backgroundColor: colors.primary },
              (pressed || batchPending) && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('home.bundleAddAll', { defaultValue: 'Add all to cart' })}
            accessibilityState={{ disabled: batchPending }}
          >
            <Icon symbol="add_shopping_cart" size={18} color={ON_PRIMARY} />
            <Text style={[styles.addAllText, { color: ON_PRIMARY }]}>
              {t('home.bundleAddAll', { defaultValue: 'Add all to cart' })}
            </Text>
          </Pressable>
          <View style={styles.listColumn}>
            {products.map((product) => (
              <HorizontalProductCard
                key={product.id}
                product={product}
                badge={resolveBadges(product, t)[0]}
                onPress={handleCardPress}
                onAddToCart={handleAdd}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaWrapper>
    );
  }

  // —— 浏览历史 tab ——
  const viewedList = viewedProducts ?? [];
  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title={headerTitle} />
      <TabBar tabs={TABS} active={active} onChange={setActive} />
      {viewedError ? (
        <ErrorState
          message={t('errors.products', { defaultValue: 'Failed to load products' })}
          onRetry={() => viewedRefetch()}
        />
      ) : !historyLoaded ||
        (historyEntries.length > 0 && viewedLoading && viewedList.length === 0) ? (
        <PageSkeleton variant="grid" />
      ) : historyEntries.length === 0 ? (
        <EmptyState
          title={t('product.historyEmpty', { defaultValue: 'No browsing history yet' })}
          description={t('product.historyEmptyDesc', {
            defaultValue: 'Products you view will show up here',
          })}
          icon="history"
          actionLabel={t('home.frequentlyBoughtBrowse')}
          onAction={() => router.push('/product/list')}
        />
      ) : viewedList.length === 0 ? (
        // 审查 Q2（20261110）：entries 有记录但商品全部下架/404 —— 区分文案，不误导为「没有浏览记录」
        <EmptyState
          title={t('product.historyEmpty', { defaultValue: 'No browsing history yet' })}
          description={t('product.historyGoneDesc', {
            defaultValue: 'Items you viewed are no longer available',
          })}
          icon="history"
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.historyHeadRow}>
            <Text style={[styles.orderHint, { color: colors['on-surface-variant'] }]}>
              {t('product.historyHint', { defaultValue: 'Most recent first, up to 50 items' })}
            </Text>
            <Pressable
              testID="history-clear"
              onPress={handleClearHistory}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('product.historyClear', { defaultValue: 'Clear history' })}
            >
              <View style={styles.clearRow}>
                <Icon symbol="delete" size={14} color={colors['on-surface-variant']} />
                <Text style={[styles.clearText, { color: colors['on-surface-variant'] }]}>
                  {t('product.historyClear', { defaultValue: 'Clear history' })}
                </Text>
              </View>
            </Pressable>
          </View>
          {/* 已下架丢弃后 viewedList 顺序 = entries 顺序（getProductsByIds 按 ids 映射），
              即最近浏览在前 */}
          <View style={styles.listColumn}>
            {viewedList.map((product) => (
              <HorizontalProductCard
                key={product.id}
                product={product}
                badge={resolveBadges(product, t)[0]}
                onPress={handleCardPress}
                onAddToCart={handleAdd}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
}

// 本地双 tab（orders 页 ORDER_TABS 同款视觉：文字 + active 底描边）
function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: HistoryTab; label: string }[];
  active: HistoryTab;
  onChange: (key: HistoryTab) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabRow, { borderBottomColor: colors['outline-variant'] }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            testID={`history-tab-${tab.key}`}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.primary : colors['on-surface-variant'] },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Primary tais-pattern Header（product/list 同款）
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const handleBack = useSafeBack();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={56} opacity={0.1} />
      </View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Icon symbol="arrow_back" size={24} color={ON_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerRightPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // 原型 .header（primary 红底 + tais 纹理 10%）
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: layout['container-margin'],
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: ON_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: layout['container-margin'],
  },
  tab: {
    paddingVertical: spacing.sm + 2,
    marginRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography['body-md'],
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  orderHint: {
    ...typography['body-sm'],
    fontSize: 12,
  },
  historyHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    ...typography['body-sm'],
    fontSize: 12,
    fontWeight: '600',
  },
  addAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md - 2,
    borderRadius: borderRadius.full,
  },
  addAllText: {
    ...typography['body-md'],
    fontWeight: '700',
    fontSize: 14,
  },
  listColumn: {
    gap: spacing.md,
  },
});
