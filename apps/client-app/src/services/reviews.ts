import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import i18n from '@/i18n';
import type { Review } from '@/types';

// Why: §8 评论模块 - API 层。mock 模式从 mockDb.reviews 读写并本地聚合 summary；
//      real 模式后端评论接口已就绪（GET /client/products/:id/reviews +
//      POST /client/orders/:orderId/review），字段经 mapReviewView 对齐前端 Review。

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
  // Why: 后端 POST /client/orders/:orderId/review —— 评论按订单维度提交（一订单一条）
  orderId: string;
  // Why: 绑定商品评论（须在订单商品内）；不传则为订单整体评论
  productId?: string;
  rating: number;
  content: string;
  // Why: 后端 CreateReviewRequest 必填 —— PRODUCT 商品评论 / DELIVERY 配送评论
  category: 'PRODUCT' | 'DELIVERY';
  images?: string[];
  // Why: 以下为 mock 展示字段；real 模式后端从 JWT/order.user 派生，不传后端
  userId?: string;
  userName?: string;
  // Why: tags 是前端展示用标签（quality/fresh 等），后端 Review 无此字段，real 不传
  tags?: string[];
}

// Why: 后端 ReviewView（review.service.ts toReviewView）—— real 模式 GET/POST 返回结构。
//      content 是 I18nText 对象（{en,zh,tet}），需按当前 locale 取串。
type LocaleText = Record<string, string>;
interface ReviewView {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  rating: number;
  content: LocaleText;
  images: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: 'PRODUCT' | 'DELIVERY';
  reply: LocaleText | null;
  repliedAt: string | null;
  productId: string | null;
  createdAt: string;
}

// Why: 后端 content 是 I18nText（按语言存的 JSON），前端 Review.content 是串。
//      按当前 locale 取，缺则回退 en → zh → tet → 任意值，保证总有展示文本。
function pickLocalized(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const obj = content as LocaleText;
    const locale = (i18n.language as string | undefined) ?? 'en';
    return obj[locale] ?? obj.en ?? obj.zh ?? obj.tet ?? Object.values(obj)[0] ?? '';
  }
  return '';
}

// Why: 后端 ReviewView → 前端 Review（字段对齐 + content 本地化）。
//      isVerified 后端无对应字段，但 createReview 校验订单归属+已送达，提交者必为购买者 → 恒 true。
function mapReviewView(r: ReviewView): Review {
  return {
    id: r.id,
    // Why: 订单整体评论 productId 为 null → 空串（商品详情页按 productId 过滤，自然不显示）
    productId: r.productId ?? '',
    userId: r.userId,
    userName: r.userName,
    avatarUrl: r.avatarUrl ?? undefined,
    rating: r.rating,
    content: pickLocalized(r.content),
    images: r.images,
    isVerified: true,
    orderId: r.orderId,
    category: r.category,
    createdAt: r.createdAt,
  };
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
    // Why: 后端 GET /client/products/:id/reviews 返回 { items, nextCursor, hasMore }（游标分页），
    //      仅 APPROVED。前端取 .items 排序 + 聚合 summary。404/异常时优雅降级为空，不阻断详情页。
    try {
      const res = await api.get<{ items: ReviewView[]; nextCursor: string | null; hasMore: boolean }>(
        `/client/products/${productId}/reviews`,
      );
      const list = sortNewestFirst(res.data.items.map(mapReviewView));
      return { reviews: list, summary: computeSummary(list) };
    } catch {
      return { reviews: [], summary: computeSummary([]) };
    }
  },

  async submitReview(input: ReviewSubmitInput): Promise<Review> {
    if (isMockMode) {
      const newReview: Review = {
        id: `rv${Date.now()}`,
        productId: input.productId ?? '',
        orderId: input.orderId,
        category: input.category,
        userId: input.userId ?? 'me',
        userName: input.userName ?? 'You',
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
    // Why: 后端 POST /client/orders/:orderId/review，body 对齐 CreateReviewRequest：
    //      content 包装为 I18nText（按当前 locale 存），category 必填，productId 可选。
    //      userId/userName/tags 后端从 JWT + order.user 派生，不传。
    const locale = (i18n.language as string | undefined) ?? 'en';
    const res = await api.post<ReviewView>(`/client/orders/${input.orderId}/review`, {
      rating: input.rating,
      content: { [locale]: input.content },
      images: input.images ?? [],
      category: input.category,
      ...(input.productId ? { productId: input.productId } : {}),
    });
    return mapReviewView(res.data);
  },
};
