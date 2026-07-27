import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import type { Review } from '@/types';

// Why: §8 评论模块 - API 层。mock 模式从 mockDb.reviews 读写并本地聚合 summary；
//      real 模式后端接口就绪后替换实现（字段同构，无需改组件）。

export interface RatingBucket {
  stars: number;
  count: number;
  percent: number;
}

export interface ReviewSummary {
  avg: number;
  count: number;
  // Why: §11.2 - 5 档完整分布（5★/4★/3★/2★/1★），不可精简到 3 档
  distribution: RatingBucket[];
}

export interface ReviewListResult {
  reviews: Review[];
  summary: ReviewSummary;
}

export interface ReviewSubmitInput {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  content: string;
  tags?: string[];
  images?: string[];
}

// Why: summary 在前端聚合，mock/real 共用一份计算逻辑，避免分布口径分裂
export function computeSummary(reviews: Review[]): ReviewSummary {
  const count = reviews.length;
  const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    buckets[star] += 1;
    sum += r.rating;
  }
  const distribution: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: buckets[stars],
    percent: count > 0 ? Math.round((buckets[stars] / count) * 100) : 0,
  }));
  return {
    avg: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    distribution,
  };
}

function sortNewestFirst(list: Review[]): Review[] {
  // Why: ISO 时间戳字典序即时间序，置顶最新（含乐观提交的「刚刚」评论）
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const reviewsApi = {
  async getByProduct(productId: string): Promise<ReviewListResult> {
    if (isMockMode) {
      const list = sortNewestFirst(
        mockDb.reviews.filter((r) => r.productId === productId),
      );
      return mockResponse({ reviews: list, summary: computeSummary(list) });
    }
    // Why: 后端 GET /client/products/:id/reviews 返回评论数组，summary 前端聚合
    const res = await api.get<Review[]>(`/client/products/${productId}/reviews`);
    const list = sortNewestFirst(res.data);
    return { reviews: list, summary: computeSummary(list) };
  },

  async submitReview(input: ReviewSubmitInput): Promise<Review> {
    if (isMockMode) {
      const newReview: Review = {
        id: `rv${Date.now()}`,
        productId: input.productId,
        userId: input.userId,
        userName: input.userName,
        rating: input.rating,
        content: input.content,
        tags: input.tags,
        images: input.images,
        // Why: 评价入口在订单详情，提交者必然购买过 -> 自动 verified（§8.6 绿色 ✓）
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      mockDb.reviews.push(newReview);
      return mockResponse(newReview);
    }
    const res = await api.post<Review>('/client/reviews', input);
    return res.data;
  },
};
