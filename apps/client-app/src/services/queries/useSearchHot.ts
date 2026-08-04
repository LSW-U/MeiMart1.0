/**
 * useSearchHot - 热搜榜 hook（P3 联调，2026-07-31）
 *
 * 后端：GET /client/search/hot（@Public，返 HotSearchItem[] = { word, searchCount }[]）
 *   - 后端已按 searchCount 降序返（PINNED 前置 + BLOCKED 剔除 + MANUAL 兜底）
 *   - word 是实际搜索词（normalize 后），非 i18n key
 *
 * 不做 mock 降级（用户要求真实返回数据，不写死）：real 模式调后端，后端 seed 已补数据。
 * staleTime 5min（热搜变更不频繁，减少请求）+ offlineFirst（弱网降级，跟 useProducts/useCategories 同模式）
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface HotSearchItem {
  /** 实际搜索词（normalize 后，如 'apple'），非 i18n key */
  word: string;
  /** 累计搜索次数（Redis ZSET score） */
  searchCount: number;
}

export function useSearchHot(limit = 6) {
  return useQuery({
    queryKey: ['search-hot', limit],
    queryFn: async () => {
      const res = await api.get<HotSearchItem[]>('/client/search/hot', { params: { limit } });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
