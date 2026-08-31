import { useQuery } from '@tanstack/react-query';
import { catalogApi } from '@/services/catalog';
import { useLocale } from '@/i18n';

// Why: 分类/-banner 名称在 service 层按当前语言烘焙（pickLocalized），若 queryKey 不含 locale，
//      切语言后 30min staleTime 内一直命中旧语言缓存（用户反馈：分类名不跟随切换）。
//      locale 入 key → 切语言即视为新查询，重新拉取/转换；旧语言条目随后被 gc 回收。
export function useCategories() {
  const locale = useLocale();
  return useQuery({
    queryKey: ['categories', locale],
    queryFn: () => catalogApi.getCategories(),
    staleTime: 30 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useBanners() {
  const locale = useLocale();
  return useQuery({
    queryKey: ['banners', locale],
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
