/**
 * useSearchHot - 热搜榜 hook（P3 联调，2026-07-31）
 *
 * 后端：GET /client/search/hot（@Public，返 HotSearchTermItem[] = { word, searchCount }[]）
 *   - 后端已按 searchCount 降序返（PINNED 前置 + BLOCKED 剔除 + MANUAL 兜底）
 *   - word 是实际搜索词（normalize 后），非 i18n key
 *
 * staleTime 5min（热搜变更不频繁，减少请求）。
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface HotSearchItem {
  /** 实际搜索词（normalize 后，如 'apple'） */
  word: string;
  /** 累计搜索次数（Redis ZSET score） */
  searchCount: number;
}

export function useSearchHot() {
  return useQuery({
    queryKey: ['search-hot'],
    queryFn: async () => {
      const res = await api.get<HotSearchItem[]>('/client/search/hot', {
        params: { limit: 6 },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
