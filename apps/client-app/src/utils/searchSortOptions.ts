/**
 * 排序档位表构建（P3-3 20261105 从 results.tsx 抽出）——纯函数便于测试：
 *   priceDesc 回退开关 disabled 分支此前零覆盖（回退时才首跑），用例直接断言两态防回退。
 */
import type { ProductSortKeyWithPending } from '@/services/queries/useProducts';

export const buildSortOptions = (priceDescEnabled: boolean) =>
  [
    { key: 'all', labelKey: 'common.all' },
    { key: 'bestSelling', labelKey: 'search.sort.bestSelling' },
    { key: 'priceAsc', labelKey: 'search.sort.priceAsc' },
    {
      key: 'priceDesc',
      labelKey: 'search.sort.priceDesc',
      disabled: !priceDescEnabled,
    },
    { key: 'newArrivals', labelKey: 'search.sort.newArrivals' },
  ] satisfies { key: ProductSortKeyWithPending; labelKey: string; disabled?: boolean }[];

export type SortOption = ReturnType<typeof buildSortOptions>[number];
