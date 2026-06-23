import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/services/user';
import type { Notification, Product, User } from '@/types';

export const PROFILE_QUERY_KEY = ['user', 'profile'] as const;
export const COUPONS_QUERY_KEY = ['user', 'coupons'] as const;
export const FAVORITES_QUERY_KEY = ['user', 'favorites'] as const;
export const NOTIFICATIONS_QUERY_KEY = ['user', 'notifications'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => userApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<User>) => userApi.updateProfile(updates),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: PROFILE_QUERY_KEY });
      const previous = qc.getQueryData<User>(PROFILE_QUERY_KEY);
      qc.setQueryData<User>(PROFILE_QUERY_KEY, (old) => (old ? { ...old, ...updates } : old));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(PROFILE_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
  });
}

export function useCoupons() {
  return useQuery({
    queryKey: COUPONS_QUERY_KEY,
    queryFn: () => userApi.getCoupons(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => userApi.getFavorites(),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: Product) => userApi.toggleFavorite(product),
    onMutate: async (product) => {
      await qc.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous = qc.getQueryData<Product[]>(FAVORITES_QUERY_KEY);
      qc.setQueryData<Product[]>(FAVORITES_QUERY_KEY, (old) => {
        if (!old) return old;
        const exists = old.some((p) => p.id === product.id);
        return exists ? old.filter((p) => p.id !== product.id) : [...old, product];
      });
      return { previous };
    },
    onError: (_err, _product, ctx) => {
      if (ctx?.previous) qc.setQueryData(FAVORITES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => userApi.getNotifications(),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.markNotificationRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const previous = qc.getQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY);
      qc.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === id ? { ...n, read: true } : n));
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(NOTIFICATIONS_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}
