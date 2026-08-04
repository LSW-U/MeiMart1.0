import type { Product } from '@/types';

/**
 * 词联想数据（与 searchSuggestApi.SuggestWord 同构，解耦 service 层类型）
 * - word：实际搜索词（点击跳 /search/results?q=word）
 * - searchCount：累计搜索次数（real: Redis ZSET score；mock: 商品 salesCount 派生）
 */
export interface SuggestWordData {
  word: string;
  searchCount: number;
}

export interface SuggestPanelProps {
  /** 词联想列表（top 5，空则隐藏词区） */
  words: SuggestWordData[];
  /** 商品联想列表（top 3，空则隐藏商品区） */
  products: Product[];
  /** 当前输入（空态 CTA 显示「回车查看 'xxx' 结果」，方案 §7.4） */
  query: string;
  /** 是否加载中（词+商品都 loading 且无旧数据时显示加载态，方案 §4.5） */
  isLoading?: boolean;
  /** 热搜词（空态 fallback 补位 chips，复用 useSearchHot 返回数据，方案 §7.4） */
  hotFallback?: SuggestWordData[];
  /** 点击词 → 跳 /search/results?q=word */
  onWordPress: (word: string) => void;
  /** 点击商品 → 跳 /product/:id */
  onProductPress: (product: Product) => void;
  /** 点击热搜 fallback 词（空态补位）→ 跳 /search/results?q=word */
  onHotFallbackPress?: (word: string) => void;
  testID?: string;
}
