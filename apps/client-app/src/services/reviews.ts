import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';
import type { Review } from '@/types';

// C-P2-5: 404 判定（axios 错误带 response.status；非 HTTP 错误一律非 404）
function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}

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
  orderId: string; // Why: 绑定商品评论（须在订单商品内）；不传则为订单整体评论
  productId?: string;
  rating: number;
  content: string;
  // Why: 后端 CreateReviewRequest 必填 —— PRODUCT 商品评论 / DELIVERY 配送评论
  category: 'PRODUCT' | 'DELIVERY';
  images?: string[];
  // Why: 以下为 mock 展示字段；real 模式后端从 JWT/order.user 派生，不传后端
  userId?: string;
  userName?: string;
  // B5 修复：tags 传后端（RB1 就绪后 Review.tags 列存储；当前 RB1 未做时后端忽略，前端先传不阻塞）
  tags?: string[];
  // 决策 2（B2 修复）：匿名评价标记。real 模式 POST body 传后端（RB1 就绪后存 Review.anonymous 列）
  anonymous?: boolean;
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
  anonymous: boolean;
  tags: string[];
  category: 'PRODUCT' | 'DELIVERY';
  reply: LocaleText | null;
  repliedAt: string | null;
  productId: string | null;
  createdAt: string;
}

// Why: 后端 content 是 I18nText（按语言存的 JSON），前端 Review.content 是 LocalizableText。
//      批1 A4 透传（D9 删本地 pickLocalized）：原样透传由渲染层 localize() 取值，切语言即翻。
//      mock 数据 content 是纯串（LocalizableText 兼容 string 直通语义）。

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
    content: (r.content ?? {}) as Review['content'],
    images: r.images,
    isVerified: true,
    anonymous: r.anonymous,
    tags: r.tags,
    status: r.status,
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
      const list = sortNewestFirst(mockDb.reviews.filter((r) => r.productId === productId));
      return mockResponse({ reviews: list, summary: computeSummary(list) });
    }
    // Why: 后端 GET /client/products/:id/reviews 返回 { items, nextCursor, hasMore }（游标分页），
    //      仅 APPROVED。前端取 .items 排序 + 聚合 summary。
    // C-P2-5: 仅 404（商品无评论端点/下架）降级空态；其余错误（500/网络）rethrow——
    //      RQ 可重试 + 监控不丢（全吞会让断网时详情页评论永远空态且无法重试）。
    try {
      // B-P2-1: 消费游标翻页（nextCursor/hasMore）聚合全量再 computeSummary——
      //   后端 take limit+1 游标分页（默认 20/页），只聚合首页会低估 avg/分布
      type ReviewPage = {
        items: ReviewView[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      const all: ReviewView[] = [];
      let cursor: string | null = null;
      let hasMore = true;
      // 防御上限：max 50/页 × 40 页 = 2000 条，异常死循环（后端 hasMore 恒 true）时截断
      for (let page = 0; page < 40 && hasMore; page++) {
        const res: { data: ReviewPage } = await api.get<ReviewPage>(
          `/client/products/${productId}/reviews${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        );
        all.push(...res.data.items);
        cursor = res.data.nextCursor;
        hasMore = res.data.hasMore && cursor != null;
      }
      const list = sortNewestFirst(all.map(mapReviewView));
      return { reviews: list, summary: computeSummary(list) };
    } catch (err) {
      if (isNotFoundError(err)) {
        return { reviews: [], summary: computeSummary([]) };
      }
      throw err;
    }
  },

  /**
   * 订单所有评价（P15 多商品评价：GET /client/orders/:id/reviews）
   * 后端返该订单所有 review（按 createdAt 升序，含 PENDING/APPROVED/REJECTED 全状态）。
   * 前端用于「已评标记」：APPROVED/PENDING 的 productId 算已评（灰色禁用），REJECTED 可重评。
   */
  async listOrderReviews(orderId: string): Promise<Review[]> {
    if (isMockMode) {
      return mockResponse([]);
    }
    const res = await api.get<ReviewView[]>(`/client/orders/${orderId}/reviews`);
    return res.data.map(mapReviewView);
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
        // 原因：批1 A4 透传后 Review.content 是 LocalizableText（string|Record），提交入参是
        // 纯串——LocalizableText 兼容 string 运行时语义，但 TS 判 string→Record 分支不重叠，
        // 经 unknown 单跳桥接（规则 36 允许写法）
        content: input.content as unknown as Review['content'],
        tags: input.tags,
        images: input.images,
        // Why: 评价入口在订单详情，提交者必然购买过 -> 自动 verified（§8.6 绿色 ✓）
        isVerified: true,
        anonymous: input.anonymous,
        createdAt: new Date().toISOString(),
      };
      mockDb.reviews.push(newReview);
      return mockResponse(newReview);
    }
    // Why: 后端 POST /client/orders/:orderId/review，body 对齐 CreateReviewRequest：
    //      content 包装为 I18nText（按当前 locale 存），category 必填，productId 可选。
    //      userId/userName 后端从 JWT + order.user 派生，不传。
    //      anonymous：决策 2，RB1 就绪后后端 DTO 加此字段透传存储；当前 RB1 未做时后端忽略。
    //      tags：B5 修复，RB1 就绪后 Review.tags 列存储；当前 RB1 未做时后端忽略，前端先传不阻塞。
    const locale = getCurrentLocale();
    const res = await api.post<ReviewView>(`/client/orders/${input.orderId}/review`, {
      rating: input.rating,
      content: { [locale]: input.content },
      images: input.images ?? [],
      category: input.category,
      anonymous: input.anonymous ?? false,
      tags: input.tags ?? [],
      ...(input.productId ? { productId: input.productId } : {}),
    });
    return mapReviewView(res.data);
  },
};
