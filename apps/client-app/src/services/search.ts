import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

// Why: 热搜词数据契约 — 后端 GET /client/search/hot 返 HotSearchItem[]
//   word 是实际搜索词（normalize 后），searchCount 是 Redis ZSET 累计搜索次数
export interface HotSearchItem {
  /** 实际搜索词（normalize 后，如 'apple'），非 i18n key */
  word: string;
  /** 累计搜索次数（Redis ZSET score） */
  searchCount: number;
}

// Why: mock 热搜词 - mock 模式降级用（real 模式调 /client/search/hot 真实端点）
//   词选 mock 商品能搜到的（apple/milk/salmon/oil/rice/eggs 匹配 p001/p005/p010/p004/p003/p002）
//   searchCount 用对应商品 salesCount 近似（mock 演示，real 以后端 Redis ZSET 为准）
//   按销量降序（rank=idx+1 反映热度）
const MOCK_HOT_SEARCH: HotSearchItem[] = [
  { word: 'Milk', searchCount: 3200 },
  { word: 'Oil', searchCount: 1560 },
  { word: 'Apple', searchCount: 1280 },
  { word: 'Rice', searchCount: 980 },
  { word: 'Salmon', searchCount: 670 },
  { word: 'Eggs', searchCount: 540 },
];

export const searchApi = {
  /**
   * 热搜词列表（GET /client/search/hot，P7 Popular 区消费）
   * 后端按 searchCount 降序返（PINNED 前置 + BLOCKED 剔除 + MANUAL 兜底）。
   * mock 模式返本地 MOCK_HOT_SEARCH（演示）；real 模式调真实端点。
   */
  async getHot(limit = 6): Promise<HotSearchItem[]> {
    if (isMockMode) {
      return mockResponse(MOCK_HOT_SEARCH.slice(0, limit));
    }
    const res = await api.get<HotSearchItem[]>('/client/search/hot', { params: { limit } });
    return res.data;
  },
};
