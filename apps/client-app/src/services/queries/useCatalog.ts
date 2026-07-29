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

// Why: P5 U3 - 子分类派生。后端 Category.children 就绪前返空数组，前端隐藏整块。
//      后端接口需求见 04-后端记录/流程清单/MeiMart-子分类接口-后端需求说明。
export function useSubCategories(categoryId: string | undefined) {
  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === categoryId);
  return category?.children ?? [];
}
