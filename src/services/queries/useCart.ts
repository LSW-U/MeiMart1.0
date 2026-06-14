import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/services/cart';
import type { Cart, CartItem, Product } from '@/types';

export const CART_QUERY_KEY = ['cart'] as const;

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
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => cartApi.getCart(),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ product, quantity }: { product: Product; quantity?: number }) =>
      cartApi.addItem(product, quantity),
    onMutate: async ({ product, quantity = 1 }) => {
      await qc.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY);
      qc.setQueryData(CART_QUERY_KEY, (old: Cart | undefined) => {
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
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, updates }: { itemId: string; updates: Partial<CartItem> }) =>
      cartApi.updateItem(itemId, updates),
    onSuccess: (cart) => qc.setQueryData(CART_QUERY_KEY, cart),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (cart) => qc.setQueryData(CART_QUERY_KEY, cart),
  });
}

export function useToggleCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, selected }: { itemId: string; selected: boolean }) =>
      cartApi.toggleSelect(itemId, selected),
    onMutate: async ({ itemId, selected }) => {
      await qc.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = qc.getQueryData(CART_QUERY_KEY);
      qc.setQueryData(CART_QUERY_KEY, (old: Cart | undefined) => {
        if (!old) return old;
        const items = old.items.map((i) => (i.id === itemId ? { ...i, selected } : i));
        return recomputeTotals(old, items);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });
}
