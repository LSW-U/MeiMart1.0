// 购物车页内容区（业务增强批3 拆分：从 app/(main)/cart.tsx 原样搬移，行为零变更）
// 顶部操作行（Your Items/Coupons/Manage 或管理态 Select Items/Cancel）
// + 购物车商品列表 + TaisDivider + PEOPLE ALSO BOUGHT 推荐区（含换一批）
import { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { CartItemRow } from '@/components/business/CartItemRow';
import { Icon } from '@/components/ui/Icon';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { SmallProductCard } from '@/components/business/SmallProductCard/SmallProductCard';
import { useAddToCart, useUpdateCartItem } from '@/services/queries/useCart';
import { useRecommendations } from '@/services/queries/useProducts';
import { toast } from '@/store/toastStore';
import type { CartItem } from '@/types';

// Why: "PEOPLE ALSO BOUGHT" 推荐改用真实商品（避免 mock id 'p003' 跳转详情 404）
// 换一批按钮（批2 推广至购物车页 2026-10-17）：offset 步进翻页，短批回绕 offset=0；
//   复用 useRecommendations（offset 进 queryKey 分批缓存，与首页同款语义）
const RECOMMEND_LIMIT = 6;

export function ItemsSection({
  manageMode,
  cart,
  couponCount,
  selectedForDelete,
  enterManage,
  exitManage,
  toggleDeleteSelect,
  removeOne,
  toggleMutate,
  soldOutHint,
}: {
  manageMode: boolean;
  cart: { items: CartItem[] };
  couponCount: number;
  selectedForDelete: Set<string>;
  enterManage: () => void;
  exitManage: () => void;
  toggleDeleteSelect: (item: CartItem) => void;
  removeOne: (item: CartItem) => void;
  toggleMutate: (vars: { itemId: string; selected: boolean }) => void;
  /** 断货行 checkbox 点击 toast 文案（库存感知批拍板 B 透传） */
  soldOutHint?: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const addToCartMutation = useAddToCart();
  const { mutate: updateMutate } = useUpdateCartItem();

  // 换一批（批2 推广）：offset state + useRecommendations 替代原 useProducts 前 6 条切片；
  //   短批/空批（< limit）下次点击回绕 offset=0；isFetching 防连点（同 home.tsx 范式）
  const [recommendOffset, setRecommendOffset] = useState(0);
  const {
    data: recommendData,
    isFetching: recommendFetching,
    refetch: refetchRecommend,
  } = useRecommendations({ limit: RECOMMEND_LIMIT, offset: recommendOffset });
  const recommended = recommendData ?? [];
  const handleRecommendChangeBatch = useCallback(() => {
    // 短批回绕后 queryKey 回 0 可能命中 staleTime 缓存（首批即短批空转，批2 P3-1 同源）→ 强制 refetch
    setRecommendOffset((prev) => {
      const next = prev + RECOMMEND_LIMIT;
      const wrapped = recommended.length < RECOMMEND_LIMIT ? 0 : next;
      if (wrapped === 0) void refetchRecommend();
      return wrapped;
    });
  }, [recommended.length, refetchRecommend]);

  // Why: 批3 A7 —— SmallProductCard 为 React.memo，回调 useCallback 稳定引用
  const handleRecommendAdd = useCallback(
    (rec: (typeof recommended)[number]) => {
      addToCartMutation.mutate(
        { product: rec, quantity: 1 },
        {
          onSuccess: () =>
            toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' })),
          onError: () =>
            toast.error(t('product.addToCartFailed', { defaultValue: 'Add to cart failed' })),
        },
      );
    },
    [addToCartMutation, t],
  );

  // Why: 批3 P2-2 —— SmallProductCard 签名 (product)=>void，直传稳定 handler（消灭内联箭头）
  const handleRecommendPress = useCallback(
    (rec: (typeof recommended)[number]) => router.push(`/product/${rec.id}`),
    [],
  );

  // A-P2-3 (D5)（审查 P1-2 修正后）：CartItemRow 为 React.memo，三处回调 useCallback 稳定引用——
  //   语义为防整列表重渲（父级 state 变化时 memo 浅比较通过则跳过重渲）。
  //   item 通过柯里化闭包携带（返回稳定到 item 维度：行数少，仅 item 变更时对应行重渲）。
  //   deps 只依赖解构出的 mutate（RQ v5 mutate 引用稳定）与 manageMode/toggleDeleteSelect，
  //   不依赖 mutation result 对象（每渲染新引用，会让工厂每渲染重建击穿 memo）。
  const makeRowPress = useCallback(
    (item: CartItem) =>
      manageMode
        ? () => toggleDeleteSelect(item)
        : () => toggleMutate({ itemId: item.id, selected: !item.selected }),
    [manageMode, toggleDeleteSelect, toggleMutate],
  );
  const makeRowItemPress = useCallback(
    (item: CartItem) => (manageMode ? undefined : () => router.push(`/product/${item.product.id}`)),
    [manageMode],
  );
  const makeRowQuantityChange = useCallback(
    (item: CartItem) =>
      manageMode
        ? undefined
        : (qty: number) => updateMutate({ itemId: item.id, updates: { quantity: qty } }),
    [manageMode, updateMutate],
  );

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 顶部操作行：默认 Your Items + Coupons + Manage；管理态 Select Items + Cancel（§4.1） */}
      <View style={styles.itemsHeader}>
        {manageMode ? (
          <Text style={[styles.itemsTitle, { color: colors['on-surface'] }]}>
            {t('cart.selectItems')}
          </Text>
        ) : (
          <Text style={[styles.itemsTitle, { color: colors['on-surface'] }]}>
            {t('cart.yourItems')}
          </Text>
        )}
        {manageMode ? (
          <Pressable
            onPress={exitManage}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('cart.cancelManage')}
          >
            <Text style={[styles.manageBtn, { color: colors.primary }]}>
              {t('cart.cancelManage')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.itemsHeaderRight}>
            <Pressable
              onPress={() => router.push('/coupons')}
              style={styles.couponsEntry}
              accessibilityRole="button"
              accessibilityLabel={t('cart.couponsAvailable', { count: couponCount })}
            >
              <Icon symbol="confirmation_number" size={16} color={colors.primary} />
              <Text style={[styles.couponsEntryText, { color: colors.primary }]}>
                {t('cart.couponsAvailable', { count: couponCount })}
              </Text>
            </Pressable>
            <Pressable
              onPress={enterManage}
              hitSlop={8}
              style={[styles.manageBtnWrap, { borderColor: colors['outline-variant'] }]}
              accessibilityRole="button"
              accessibilityLabel={t('cart.manage')}
            >
              <Text style={[styles.manageBtn, { color: colors['on-surface-variant'] }]}>
                {t('cart.manage')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 购物车商品列表 */}
      <View style={styles.cartList}>
        {cart.items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.cartItemWrap,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
            ]}
          >
            <CartItemRow
              item={item}
              // §4.2 管理态：checkbox 切删除选中 + 反映 selectedForDelete；步进器隐藏（onQuantityChange=undefined）
              // A-P2-3 (D5)：三处回调经 make* 工厂传稳定引用（防整列表重渲，见上）
              onPress={makeRowPress(item)}
              checkedOverride={manageMode ? selectedForDelete.has(item.id) : undefined}
              onItemPress={makeRowItemPress(item)}
              onQuantityChange={makeRowQuantityChange(item)}
              onDelete={manageMode ? removeOne : undefined}
              showControls
              // 20261114 库存感知批（拍板 B）：断货行灰显+badge+禁勾（stock===0 铁定断货）
              soldOut={item.product.stock === 0}
              soldOutHint={soldOutHint}
            />
          </View>
        ))}
      </View>

      {/* Tais Divider（HTML 第 224-227 行） */}
      <View style={styles.dividerWrap}>
        <TaisDivider width={120} />
      </View>

      {/* PEOPLE ALSO BOUGHT 推荐区 */}
      <View style={styles.recommendWrap}>
        <View style={styles.recommendHeader}>
          <Text style={[styles.recommendTitle, { color: colors['on-surface-variant'] }]}>
            {t('cart.peopleAlsoBought')}
          </Text>
          {/* 换一批按钮（批2 推广至购物车页）：offset 步进 + 短批回绕，isFetching 防连点 */}
          <Pressable
            testID="cart-change-batch"
            onPress={handleRecommendChangeBatch}
            disabled={recommendFetching}
            style={({ pressed }) => [styles.changeBatchBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('home.changeBatch')}
          >
            <Icon
              symbol="refresh"
              size={16}
              color={recommendFetching ? colors.outline : colors.primary}
            />
            <Text
              style={[
                styles.changeBatchText,
                { color: recommendFetching ? colors.outline : colors.primary },
              ]}
            >
              {t('home.changeBatch')}
            </Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.recommendRow}>
            {recommended.map((rec) => (
              // Why: P1 - 替换内联 recommendCard 为统一 SmallProductCard（方案 §4）
              <SmallProductCard
                key={rec.id}
                product={rec}
                onPress={handleRecommendPress}
                onAddToCart={handleRecommendAdd}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: layout['container-margin'],
    paddingBottom: 160,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  itemsTitle: {
    ...typography.h3,
    fontWeight: '700',
  },
  couponsEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  couponsEntryText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  // §3.2 顶部右侧 Coupons + Manage 组合
  itemsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  manageBtnWrap: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 4,
  },
  manageBtn: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  cartList: {
    gap: spacing.md,
  },
  cartItemWrap: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  dividerWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    opacity: 0.3,
  },
  recommendWrap: {
    marginBottom: spacing.md,
  },
  // 换一批按钮（批2 推广）：标题与按钮同行两端
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  recommendTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  changeBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  changeBatchText: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '600',
  },
  recommendRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
