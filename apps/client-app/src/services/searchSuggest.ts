import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';

/**
 * 搜索建议（词联想）service - C方案 §4.3
 *
 * 后端：GET /client/search/suggest?prefix=xxx&limit=N（@Public，返 { word, searchCount }[]）
 *   三源合并去重：HotSearchTerm 词库 + Redis ZSET 真实词 + 商品名前缀（见方案 §5.3）
 *   word 是实际搜索词（normalize 后），非 i18n key；searchCount 是 Redis ZSET score
 *
 * mock 策略：从 mockDb.products 商品名前缀匹配派生（非写死预设词列表，searchCount=salesCount 派生）。
 *   与 useSearchHot 的"不写死"不冲突——hot 榜是运营固定数据（PINNED/MANUAL），suggest 是输入联想，
 *   mock 无 hot search 词库可用，只能从商品数据派生。real 模式调后端，B1 就绪后联调。
 *   mock 局限：词联想 = 商品名整词，与商品联想高度重合；real 模式后端三源合并更有"搜索词"感。
 */

export interface SuggestWord {
  /** 实际搜索词（normalize 后），点击跳 /search/results?q=word */
  word: string;
  /** 累计搜索次数（real: Redis ZSET score；mock: 商品 salesCount 派生） */
  searchCount: number;
}

export const searchSuggestApi = {
  async getSuggest(prefix: string, limit = 5): Promise<SuggestWord[]> {
    const normalizedPrefix = prefix.trim().toLowerCase();
    if (!normalizedPrefix) return [];

    if (isMockMode) {
      // Why: mock 从商品名前缀匹配派生（startsWith 非包含，对齐后端 suggest 前缀语义）
      const locale = getCurrentLocale();
      const matched = mockDb.products
        .filter((p) => {
          const name = (p.name[locale] ?? p.name.en ?? '').toLowerCase();
          return name.startsWith(normalizedPrefix);
        })
        .slice(0, limit);
      const result = matched
        .map((p) => ({
          word: p.name[locale] ?? p.name.en ?? '',
          searchCount: p.salesCount ?? 0,
        }))
        .filter((item) => Boolean(item.word));
      return mockResponse(result, 200);
    }

    const res = await api.get<SuggestWord[]>('/client/search/suggest', {
      params: { prefix, limit },
    });
    return res.data;
  },
};
