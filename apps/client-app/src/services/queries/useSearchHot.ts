/**
 * useSearchHot - 热搜榜 hook（P3 联调，2026-07-31）
 *
 * 后端：GET /client/search/hot（@Public，返 HotSearchItem[] = { word, searchCount }[]）
 *   - 后端已按 searchCount 降序返（PINNED 前置 + BLOCKED 剔除 + MANUAL 兜底）
 *   - word 是实际搜索词（normalize 后），非 i18n key
 *
 * mock 模式：searchApi.getHot 返本地 MOCK_HOT_SEARCH（演示）
 * staleTime 5min（热搜变更不频繁，减少请求）+ offlineFirst（弱网降级，跟 useProducts/useCategories 同模式）
 */
import { useQuery } from '@tanstack/react-query';
import { searchApi, type HotSearchItem } from '@/services/search';

export type { HotSearchItem };

export function useSearchHot(limit = 6) {
  return useQuery({
    queryKey: ['search-hot', limit],
    queryFn: () => searchApi.getHot(limit),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
