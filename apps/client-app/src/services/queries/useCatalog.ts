import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalog';

// Why: 批1 A4 透传（裁决 B）后分类/banner 名称不再在 service 层烘焙（原样透传多语 Record），
//      渲染层 localize() 取值——切语言无需换 key 重查，key 去掉 locale 段
//      （消灭同一数据按语言分裂的 N 份缓存，也顺带消除 staleTime 内旧语言命中问题）。
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
