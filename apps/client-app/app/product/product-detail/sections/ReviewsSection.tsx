// §8 评论模块 - useReviews 驱动：评分卡（count>0）/ 加载骨架 / 空态
// 批5 拆分：从 app/product/[id].tsx 原样搬移（含 ReviewCard/StarsRow 引用），行为零变更
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { toast } from '@/store/toastStore';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { StarsRow } from '../shared';
import type { Review } from '@/types';

export function ReviewsSection({
  reviewsLoading,
  reviewSummary,
  reviews,
  highlightReviewId,
  isSoldOut,
  formatRelTime,
  writeReview,
}: {
  reviewsLoading: boolean;
  // 评分汇总（useReviews summary，count>0 时渲染汇总卡）
  reviewSummary:
    { avg: number; count: number; distribution: { stars: number; percent: number }[] } | undefined;
  reviews: Review[];
  highlightReviewId: string | null;
  isSoldOut: boolean;
  formatRelTime: (iso: string) => string;
  writeReview: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.section} collapsable={false}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
          {t('product.reviewsTitle')}
        </Text>
        {!isSoldOut && (
          <Pressable
            onPress={writeReview}
            style={[styles.writeReviewBtn, { borderBottomColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('product.writeReview')}
          >
            <Text style={[styles.writeReviewText, { color: colors.primary }]}>
              {t('product.writeReview')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 加载态：评分区淡化 + 占位 */}
      {reviewsLoading && (
        <View
          style={[
            styles.ratingSummary,
            { backgroundColor: colors['surface-container-high'], opacity: 0.6 },
          ]}
        >
          <View style={styles.ratingSummaryLeft}>
            <Text style={[styles.ratingBig, { color: colors['outline-variant'] }]}>—</Text>
          </View>
          <View style={[styles.ratingBars, { borderLeftColor: colors['outline-variant'] }]}>
            {[5, 4, 3].map((s) => (
              <View key={s} style={styles.ratingBarRow}>
                <Text style={[styles.ratingBarLabel, { color: colors['outline-variant'] }]}>
                  {s}
                </Text>
                <View
                  style={[styles.ratingBarTrack, { backgroundColor: colors['surface-container'] }]}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 有评论：评分汇总卡（avg + 星 + 5 档分布）+ 评论列表 */}
      {!reviewsLoading && reviewSummary && reviewSummary.count > 0 && (
        <>
          <View
            style={[styles.ratingSummary, { backgroundColor: colors['surface-container-high'] }]}
          >
            <View style={styles.ratingSummaryLeft}>
              <Text style={[styles.ratingBig, { color: colors['on-surface'] }]}>
                {reviewSummary.avg.toFixed(1)}
              </Text>
              <StarsRow size={16} rating={Math.round(reviewSummary.avg)} />
              <Text style={[styles.ratingCount, { color: colors.secondary }]}>
                {reviewSummary.count} {t('product.reviews')}
              </Text>
            </View>
            <View style={[styles.ratingBars, { borderLeftColor: colors['outline-variant'] }]}>
              {reviewSummary.distribution.map((r) => (
                <View key={r.stars} style={styles.ratingBarRow}>
                  <Text style={[styles.ratingBarLabel, { color: colors['on-surface-variant'] }]}>
                    {r.stars}
                  </Text>
                  <View
                    style={[
                      styles.ratingBarTrack,
                      { backgroundColor: colors['surface-container'] },
                    ]}
                  >
                    <View
                      style={[
                        styles.ratingBarFill,
                        {
                          backgroundColor: colors['tertiary-container'],
                          width: `${r.percent}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.ratingBarPercent, { color: colors['on-surface-variant'] }]}>
                    {r.percent}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.reviewList}>
            {reviews.slice(0, 3).map((r) => {
              const isHighlighted = r.id === highlightReviewId;
              return (
                <ReviewCard
                  key={r.id}
                  review={r}
                  highlighted={isHighlighted}
                  dateText={formatRelTime(r.createdAt)}
                />
              );
            })}
          </View>
          {/* §8.7 首屏 3 条 + 查看全部（独立列表页属第二层，此处占位跳转） */}
          {reviewSummary.count > 3 && (
            <Pressable
              onPress={() =>
                toast.info(t('product.viewAllReviews', { count: reviewSummary.count }))
              }
              style={styles.viewAllReviewsBtn}
              accessibilityRole="button"
              accessibilityLabel={t('product.viewAllReviews', {
                count: reviewSummary.count,
              })}
            >
              <Text style={[styles.viewAllReviewsText, { color: colors.primary }]}>
                {t('product.viewAllReviews', { count: reviewSummary.count })} →
              </Text>
            </Pressable>
          )}
        </>
      )}

      {/* 空态：无评论引导 */}
      {!reviewsLoading && (!reviewSummary || reviewSummary.count === 0) && (
        <View style={[styles.reviewsEmpty, { backgroundColor: colors['surface-container-low'] }]}>
          <Text style={styles.reviewsEmptyIcon}>💬</Text>
          <Text style={[styles.reviewsEmptyTitle, { color: colors['on-surface-variant'] }]}>
            {t('product.noReviews')}
          </Text>
          <Text style={[styles.reviewsEmptyDesc, { color: colors.secondary }]}>
            {t('product.noReviewsDesc')}
          </Text>
        </View>
      )}
    </View>
  );
}

// §8 评论卡 - 头像首字母 + 名 + 星 + 相对时间 + 正文 + 图 + 标签 + verified（提取为组件便于独立渲染）
export function ReviewCard({
  review,
  highlighted,
  dateText,
}: {
  review: Review;
  highlighted: boolean;
  dateText: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // P15 RB1：anonymous=true 时展示「匿名用户」+ 头像「?」（后端返真实 userName + 标记，前端隐藏）
  const displayName = review.anonymous ? t('review.anonymousDisplayName') : review.userName;
  const initial = review.anonymous ? '?' : (review.userName.trim()[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.reviewCard,
        {
          backgroundColor: highlighted
            ? colors.semantic['positive-container']
            : colors['surface-container-lowest'],
          borderColor: highlighted ? colors.semantic.positive : colors['outline-variant'],
          borderWidth: highlighted ? 2 : 1,
        },
      ]}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.reviewAvatarName}>
          <View
            style={[
              styles.reviewAvatar,
              {
                backgroundColor: highlighted ? colors.primary : colors['surface-container'],
              },
            ]}
          >
            <Text
              style={[
                styles.reviewAvatarText,
                { color: highlighted ? colors['on-primary'] : colors['on-surface-variant'] },
              ]}
            >
              {initial}
            </Text>
          </View>
          <View>
            <Text style={[styles.reviewName, { color: colors['on-surface'] }]}>{displayName}</Text>
            <StarsRow size={12} rating={review.rating} />
          </View>
        </View>
        <Text
          style={[
            styles.reviewDate,
            { color: highlighted ? colors.semantic.positive : colors.secondary },
          ]}
        >
          {dateText}
        </Text>
      </View>
      <Text style={[styles.reviewBody, { color: colors['on-surface-variant'] }]}>
        {review.content}
      </Text>
      {/* 评论图片（可选，缩略图横排） */}
      {review.images && review.images.length > 0 && (
        <View style={styles.reviewImages}>
          {review.images.map((uri, idx) => (
            <SafeImage
              key={idx}
              source={{ uri }}
              style={[styles.reviewImage, { backgroundColor: colors['surface-variant'] }]}
            />
          ))}
        </View>
      )}
      {/* 评价标签（复用 review.tag.*，缺 key 时降级为原始标识） */}
      {review.tags && review.tags.length > 0 && (
        <View style={styles.reviewTags}>
          {review.tags.map((tag) => (
            <View
              key={tag}
              style={[styles.reviewTag, { backgroundColor: colors['surface-container-high'] }]}
            >
              <Text style={[styles.reviewTagText, { color: colors.primary }]}>
                {t(`review.tag.${tag}`, { defaultValue: tag })}
              </Text>
            </View>
          ))}
        </View>
      )}
      {/* §8.6 verified purchase 绿色 ✓（仅 isVerified=true 显示） */}
      {review.isVerified && (
        <View style={styles.verifiedBadge}>
          <Icon symbol="check" size={10} color={colors.semantic.positive} />
          <Text style={[styles.verifiedText, { color: colors.semantic.positive }]}>
            {t('product.verifiedPurchase')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  writeReviewBtn: {
    borderBottomWidth: 1,
  },
  writeReviewText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  ratingSummary: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
  },
  ratingSummaryLeft: {
    alignItems: 'center',
    gap: 2,
  },
  ratingBig: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Noto Serif',
  },
  ratingCount: {
    ...typography['body-sm'],
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
    gap: spacing.xs,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: spacing.lg,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingBarLabel: {
    ...typography['label-caps'],
    width: 16,
    fontSize: 12,
  },
  ratingBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
  },
  ratingBarPercent: {
    ...typography['body-sm'],
    width: 32,
    fontSize: 9,
    textAlign: 'right',
  },
  reviewList: {
    gap: spacing.md,
  },
  reviewCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewAvatarName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reviewName: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  reviewDate: {
    ...typography['body-sm'],
    fontSize: 12,
  },
  reviewBody: {
    ...typography['body-sm'],
    fontStyle: 'italic',
    lineHeight: 20,
  },
  reviewImages: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reviewImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reviewTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  reviewTagText: {
    ...typography['label-caps'],
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllReviewsBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  viewAllReviewsText: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  reviewsEmpty: {
    alignItems: 'center',
    padding: spacing.xl + spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  reviewsEmptyIcon: {
    fontSize: 36,
  },
  reviewsEmptyTitle: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  reviewsEmptyDesc: {
    ...typography['body-sm'],
    textAlign: 'center',
  },
});
