import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reviewsApi, computeSummary, type ReviewSubmitInput, type ReviewListResult } from '@/services/reviews';
import { useProfile } from '@/services/queries/useUser';
import type { Review } from '@/types';

// Why: §8 评论模块 - hook 层。query 按 productId 拉评论 + 聚合 summary；
//      mutation 乐观更新（评论立即置顶 + 评分即时更新，§11.2）。

export const REVIEWS_QUERY_KEY = (productId: string) => ['reviews', productId] as const;

// Why: §11.2 - 跨页提交（review.tsx -> product 页）后，新评论绿色置顶高亮。
//      提交时写入，详情页 focus 时 consume 一次（读后即清，避免重复高亮）。
let _lastSubmittedReviewId: string | null = null;

export function consumeLastSubmittedReviewId(): string | null {
  const id = _lastSubmittedReviewId;
  _lastSubmittedReviewId = null;
  return id;
}

export function useReviews(productId: string | undefined) {
  return useQuery({
    queryKey: REVIEWS_QUERY_KEY(productId ?? ''),
    queryFn: () => reviewsApi.getByProduct(productId as string),
    staleTime: 60 * 1000,
    networkMode: 'offlineFirst',
    enabled: Boolean(productId),
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: me } = useProfile();

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
      const key = REVIEWS_QUERY_KEY(input.productId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ReviewListResult>(key);
      const optimisticReview: Review = {
        id: `rv-opt-${Date.now()}`,
        productId: input.productId,
        userId: me?.id ?? 'me',
        userName: me?.name ?? t('review.you', { defaultValue: 'You' }),
        rating: input.rating,
        content: input.content,
        tags: input.tags,
        images: input.images,
        isVerified: true,
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
      qc.invalidateQueries({ queryKey: REVIEWS_QUERY_KEY(input.productId) });
    },
  });
}
