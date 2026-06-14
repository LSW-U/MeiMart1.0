import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/services/cart';
import type { CartItem, Product } from '@/types';

export const CART_QUERY_KEY = ['cart'] as const;

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
      qc.setQueryData(CART_QUERY_KEY, (old: any) => {
        if (!old) return old;
        const existing = old.items.find((i: CartItem) => i.product.id === product.id);
        let items: CartItem[];
        if (existing) {
          items = old.items.map((i: CartItem) =>
            i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
          );
        } else {
          items = [...old.items, { id: `ci${Date.now()}`, product, quantity, selected: true }];
        }
        const selectedItems = items.filter((i: CartItem) => i.selected);
        return {
          ...old,
          items,
          totalItems: selectedItems.reduce((sum: number, i: CartItem) => sum + i.quantity, 0),
          totalPrice: selectedItems.reduce(
            (sum: number, i: CartItem) => sum + i.product.price * i.quantity,
            0,
          ),
        };
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
    onSuccess: (cart) => qc.setQueryData(CART_QUERY_KEY, cart),
  });
}
