import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  reviewsApi,
  computeSummary,
  type ReviewSubmitInput,
  type ReviewListResult,
} from '@/services/reviews';
import { useProfile } from '@/services/queries/useUser';
import { useLocale } from '@/i18n';
import type { Review } from '@/types';

// Why: §8 评论模块 - hook 层。query 按 productId 拉评论 + 聚合 summary；
//      mutation 乐观更新（评论立即置顶 + 评分即时更新，§11.2）。

// Why: 评论内容在 service 层 pickLocalized 按语言烘焙，locale 入 key —— 切语言后
//      旧语言条目 key 不同自动重查（同 categories 缓存 bug 批量修复）。
//      根常量供 onSettled 前缀失效用（覆盖所有 locale），避免裸字面量漂移（审查报告 F3 建议）
export const REVIEWS_ROOT_KEY = ['reviews'] as const;
export const ORDER_REVIEWS_ROOT_KEY = ['order-reviews'] as const;

export const REVIEWS_QUERY_KEY = (locale: string, productId: string) =>
  [...REVIEWS_ROOT_KEY, locale, productId] as const;

// Why: §11.2 - 跨页提交（review.tsx -> product 页）后，新评论绿色置顶高亮。
//      提交时写入，详情页 focus 时 consume 一次（读后即清，避免重复高亮）。
let _lastSubmittedReviewId: string | null = null;

export function consumeLastSubmittedReviewId(): string | null {
  const id = _lastSubmittedReviewId;
  _lastSubmittedReviewId = null;
  return id;
}

export function useReviews(productId: string | undefined) {
  const locale = useLocale();
  return useQuery({
    queryKey: REVIEWS_QUERY_KEY(locale, productId ?? ''),
    queryFn: () => reviewsApi.getByProduct(productId as string),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: Boolean(productId),
  });
}

/**
 * 订单所有评价（P15 多商品：判断已评商品，后端 GET /client/orders/:id/reviews）
 * staleTime 30s：评价页反复进出，短缓存减少重复请求；提交后 submit onSuccess invalidate 刷新
 * locale 入 key（评论 content 按语言烘焙，同 REVIEWS_QUERY_KEY）
 */
export const ORDER_REVIEWS_KEY = (locale: string, orderId: string) =>
  [...ORDER_REVIEWS_ROOT_KEY, locale, orderId] as const;

export function useOrderReviews(orderId: string) {
  const locale = useLocale();
  return useQuery({
    queryKey: ORDER_REVIEWS_KEY(locale, orderId),
    queryFn: () => reviewsApi.listOrderReviews(orderId),
    staleTime: 30 * 1000,
    networkMode: 'offlineFirst',
    enabled: Boolean(orderId),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: me } = useProfile();
  const locale = useLocale();

  return useMutation({
    mutationFn: (input: Omit<ReviewSubmitInput, 'userId' | 'userName'>) => {
      // Why: 作者由 hook 注入（提交者必然登录），组件只需传业务字段
      const author = {
        userId: me?.id ?? 'me',
        userName: me?.name ?? t('review.you', { defaultValue: 'You' }),
      };
      return reviewsApi.submitReview({ ...input, ...author });
    },
    onMutate: async (input) => {
      // Why: productId 可选（订单整体评论无绑定商品）；缺省用空串作 key，与详情页查询自然不匹配
      //      （仅失去乐观置顶，onSettled 仍会 invalidate 拉真实数据）
      const productIdKey = input.productId ?? '';
      const key = REVIEWS_QUERY_KEY(locale, productIdKey);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ReviewListResult>(key);
      const optimisticReview: Review = {
        id: `rv-opt-${Date.now()}`,
        productId: productIdKey,
        orderId: input.orderId,
        category: input.category,
        userId: me?.id ?? 'me',
        userName: me?.name ?? t('review.you', { defaultValue: 'You' }),
        rating: input.rating,
        content: input.content,
        tags: input.tags,
        images: input.images,
        isVerified: true,
        anonymous: input.anonymous,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<ReviewListResult>(key, (old) => {
        const reviews = old?.reviews ? [optimisticReview, ...old.reviews] : [optimisticReview];
        return { reviews, summary: computeSummary(reviews) };
      });
      return { previous, key, optimisticId: optimisticReview.id };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
    },
    onSuccess: (review) => {
      // Why: 标记真实评论 id，供详情页 focus 时绿色高亮（§11.2）
      _lastSubmittedReviewId = review.id;
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: REVIEWS_ROOT_KEY });
      // P15 多商品：刷新订单已评列表（review 页已评标记实时更新，防重复提交）
      qc.invalidateQueries({ queryKey: ORDER_REVIEWS_ROOT_KEY });
    },
  });
}
