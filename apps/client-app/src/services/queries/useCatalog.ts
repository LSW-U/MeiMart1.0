import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalog';
import { STALE_TIME, CATEGORIES_QUERY_KEY, BANNERS_QUERY_KEY } from '@/lib/queryKeys';

// Why: 批1 A4 透传（裁决 B）后分类/banner 名称不再在 service 层烘焙（原样透传多语 Record），
//      渲染层 localize() 取值——切语言无需换 key 重查，key 去掉 locale 段
//      （消灭同一数据按语言分裂的 N 份缓存，也顺带消除 staleTime 内旧语言命中问题）。
// 轻量化省流批2：目录类走分层 TTL（catalogPolicy.ts），断网冷启动目录可浏览（A5）
export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: () => catalogApi.getCategories(),
    staleTime: STALE_TIME.categories,
    networkMode: 'offlineFirst',
  });
}

export function useBanners() {
  return useQuery({
    queryKey: BANNERS_QUERY_KEY,
    queryFn: () => catalogApi.getBanners(),
    staleTime: STALE_TIME.banners,
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
