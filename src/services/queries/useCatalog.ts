import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalog';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
    staleTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: () => catalogApi.getBanners(),
    staleTime: 10 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
