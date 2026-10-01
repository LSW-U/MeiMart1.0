import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, businessError } from '@/services/cart';
import { isMockMode } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Cart, CartItem, Product } from '@/types';

export const CART_ROOT_KEY = ['cart'] as const;

// Why: 批1 A4 透传（裁决 B）后购物车商品名不再在 service 层烘焙（transformCartItem 原样
//      透传多语 Record），渲染层 localize() 取值——切语言无需换 key 重查，key 去掉 locale
//      段（消灭同一购物车按语言分裂的 N 份缓存）。保留 factory 形态，调用方不变。
export const CART_QUERY_KEY = () => [...CART_ROOT_KEY] as const;

// Why: 结算预览按地址 + 券码查（运费/仓库匹配/折扣），地址或券变 → key 变 → 自动重查
export const CHECKOUT_PREVIEW_KEY = (addressId: string, couponCode: string) =>
  ['checkout-preview', addressId, couponCode] as const;

function recomputeTotals(cart: Cart, items: CartItem[]): Cart {
  const selectedItems = items.filter((i) => i.selected);
  return {
    ...cart,
    items,
    totalItems: selectedItems.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  };
}

export function useCart() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: CART_QUERY_KEY(),
    queryFn: () => cartApi.getCart(),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: isAuthenticated, // 未登录时不请求，避免 401
  });
}

// Why: 结算页预览 —— real 模式按地址 + 券码查运费 + 仓库匹配 + 折扣聚合（cartApi.checkoutPreview）。
//      mock 模式不调（用 demo 常量 MOCK_DELIVERY_FEE/MOCK_DISCOUNT 保持展示稳定）。
//      couponCode 变（选/换/清券）-> key 变 -> 重查，preview.discount/payableAmount 自动更新。
export function useCheckoutPreview(addressId: string | undefined, couponCode?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const code = couponCode ?? '';
  return useQuery({
    queryKey: CHECKOUT_PREVIEW_KEY(addressId ?? '', code),
    queryFn: () => cartApi.checkoutPreview(addressId as string, code || undefined),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
    enabled: !isMockMode && isAuthenticated && Boolean(addressId),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ product, quantity = 1 }: { product: Product; quantity?: number }) => {
      // Why: §7.3 加购前库存二次校验。读当前购物车缓存，断货/超限抛错触发组件 onError toast，防止超卖。
      //      错误 message 用稳定标识（SOLD_OUT / STOCK_EXCEEDED），组件层按文案映射 i18n。
      //      批3#11（批2 转办 P2-2）：这类确定性业务失败抛 name==='BusinessError'——
      //      useOfflineMutation 守卫不入队（重试也不会成功，入队只造成失败重放循环）。
      //      message 仍以 'SOLD_OUT'/'STOCK_EXCEEDED' 结尾，组件层按 includes 匹配不变。
      if (product.stock != null) {
        const cart = qc.getQueryData<Cart>(CART_QUERY_KEY());
        const existingQty = cart?.items.find((i) => i.product.id === product.id)?.quantity ?? 0;
        if (product.stock === 0) throw businessError('SOLD_OUT');
        if (existingQty + quantity > product.stock) throw businessError('STOCK_EXCEEDED');
      }
      return cartApi.addItem(product, quantity);
    },
    onMutate: async ({ product, quantity = 1 }) => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const existing = old.items.find((i) => i.product.id === product.id);
        const items: CartItem[] = existing
          ? old.items.map((i) =>
              i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
            )
          : [...old.items, { id: `ci${Date.now()}`, product, quantity, selected: true }];
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<CartItem> }) =>
      cartApi.updateItem(itemId, updates),
    onMutate: async ({ itemId, updates }) => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const items = old.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i));
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onMutate: async (itemId) => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const items = old.items.filter((i) => i.id !== itemId);
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}

// C-P2-8（页面批量删收敛）：批量删除走 service 层 removeItems——N 个 id 单次 mutation、
// 乐观删 N 项、仅一次 invalidate（原页面 forEach 逐 id mutate：N 次 DELETE + N 次 getCart +
// N 次 invalidate 竞态）。单删仍用 useRemoveCartItem（语义不变）。
export function useRemoveCartItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => cartApi.removeItems(itemIds),
    onMutate: async (itemIds) => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const ids = new Set(itemIds);
        const items = old.items.filter((i) => !ids.has(i.id));
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}

// Why: 下单成功后清空「已选中」购物车项（本次下单的），防回购物车重复下单。
// 乐观：onMutate 立即从缓存删选中项（用户回 cart 页瞬间空），失败回滚，onSettled invalidate 校准。
export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clearSelected(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const items = old.items.filter((i) => !i.selected);
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}

export function useToggleCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, selected }: { itemId: string; selected: boolean }) =>
      cartApi.toggleSelect(itemId, selected),
    onMutate: async ({ itemId, selected }) => {
      await qc.cancelQueries({ queryKey: CART_ROOT_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY());
      qc.setQueryData(CART_QUERY_KEY(), (old: Cart | undefined) => {
        if (!old) return old;
        const items = old.items.map((i) => (i.id === itemId ? { ...i, selected } : i));
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY(), ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_ROOT_KEY }),
  });
}
