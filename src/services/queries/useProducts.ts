import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productApi } from '@/services/products';
import type { Product } from '@/types';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getProduct(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['products', 'recommend'],
    queryFn: () => productApi.getRecommendations(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useProductSearch(keyword: string, enabled = true) {
  return useQuery<Product[]>({
    queryKey: ['products', 'search', keyword],
    queryFn: () => productApi.search(keyword),
    enabled: enabled && keyword.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useProductsByCategory(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['products', 'category', categoryId],
    queryFn: () => productApi.getByCategory(categoryId as string),
    enabled: Boolean(categoryId),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
