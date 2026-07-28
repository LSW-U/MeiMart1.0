// ProductDetailPage — 还原自 ProductDetailPage.html（449 行，最复杂的页面）
// HTML → RN 行数比：449 → ~520（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 116%）
// Fix-12: 重建 11 个缺失模块
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Share,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { useProduct, useProducts } from '@/services/queries/useProducts';
import { isMockMode } from '@/services/api';
import { useAddToCart, useCart } from '@/services/queries/useCart';
import { useFavorites, useToggleFavorite } from '@/services/queries/useFavorites';
import { useAddresses } from '@/services/queries/useAddress';
import { useReviews, consumeLastSubmittedReviewId } from '@/services/queries/useReviews';
import { getVariantGroups } from '@/config/variantTemplates';
import { formatCompactNumber, getRelativeTimeUnit } from '@/utils/format';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import type { Review } from '@/types';

const SCREEN_WIDTH = Dimensions.get('window').width;

const TABS = ['PRODUCT', 'REVIEWS', 'RECOMMENDED', 'DETAILS'] as const;
type TabKey = (typeof TABS)[number];

// 配对商品（HTML 第 376-408 行）— 用真实 mockDb id，数据从 useProducts 动态拉取
const PAIRS_WELL_WITH_IDS = ['p003', 'p005', 'p008'];

// {t('product.relatedProducts')}（HTML 第 418-437 行）— 用真实 mockDb id
const YOU_MAY_LIKE_IDS = ['p006', 'p009'];

// §7 库存状态：充足 / 紧张 / 断货 / 未知（后端不返回 stock 时降级为「有货」绿点）
type StockState = 'plenty' | 'low' | 'out' | 'unknown';
function computeStockState(stock: number | undefined): StockState {
  if (stock == null) return 'unknown';
  if (stock === 0) return 'out';
  if (stock > 20) return 'plenty';
  return 'low';
}

// 星级行：按 rating 亮 N 颗星（评论卡按评分填充），默认全亮（评分汇总区装饰用）
function StarsRow({ size = 14, rating = 5 }: { size?: number; rating?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          symbol="star"
          size={size}
          color={n <= rating ? colors['tertiary-container'] : colors['outline-variant']}
        />
      ))}
    </View>
  );
}

export default function ProductDetailPage() {
  const handleBack = useSafeBack();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { data: allProducts } = useProducts();
  const { data: favorites } = useFavorites();
  const { data: cart } = useCart();
  const { data: addresses } = useAddresses();
  const { data: reviewData, isLoading: reviewsLoading } = useReviews(product?.id);
  const totalItems = cart?.totalItems ?? 0;
  const toggleFavoriteMutation = useToggleFavorite();
  const addToCartMutation = useAddToCart();

  // real 模式下商品 id 是 uuid（mock 的 p003/p006 等匹配不到），改为同类目优先 + 其他补足
  const pairsWellWith = isMockMode
    ? (allProducts ?? []).filter((p) => PAIRS_WELL_WITH_IDS.includes(p.id))
    : [
        ...(allProducts ?? []).filter((p) => p.category === product?.category && p.id !== product?.id),
        ...(allProducts ?? []).filter((p) => p.category !== product?.category && p.id !== product?.id),
      ].slice(0, 3);
  const youMayLike = isMockMode
    ? (allProducts ?? []).filter((p) => YOU_MAY_LIKE_IDS.includes(p.id))
    : (allProducts ?? []).filter((p) => p.id !== product?.id).slice(0, 4);
  const isFavorite = Boolean(product && (favorites ?? []).some((p) => p.id === product.id));

  const [activeTab, setActiveTab] = useState<TabKey>('PRODUCT');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [variantSelection, setVariantSelection] = useState<Record<string, string>>({});
  const [highlightReviewId, setHighlightReviewId] = useState<string | null>(null);

  // §11.2 跨页提交高亮：评价页 submit 后回到本页 focus 时，读一次刚提交的评论 id（读后即清）
  useFocusEffect(
    useCallback(() => {
      const submittedId = consumeLastSubmittedReviewId();
      if (submittedId) setHighlightReviewId(submittedId);
    }, []),
  );

  if (isLoading) {
    return (
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <TopBar activeTab={activeTab} onTabPress={() => {}} onBack={handleBack} />
        <View style={styles.center}>
          <Text style={{ color: colors['on-surface-variant'] }}>{t('common.loading')}</Text>
        </View>
      </SafeAreaWrapper>
    );
  }
  if (isError || !product) {
    return (
      <SafeAreaWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <TopBar activeTab={activeTab} onTabPress={() => {}} onBack={handleBack} />
        <ErrorState message={t('product.notFound')} onRetry={() => refetch()} />
      </SafeAreaWrapper>
    );
  }

  // §7 库存 + §8 评论 + §9 Q1 规格 + §9 Q2 地址 — 全部从字段/接口派生，不再写死
  const stockState = computeStockState(product.stock);
  const isSoldOut = stockState === 'out';
  const variants = getVariantGroups(product.category);
  const defaultAddr = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const reviews = reviewData?.reviews ?? [];
  const reviewSummary = reviewData?.summary;

  // 步进器上限 = stock（stock 未知时不限）
  const qtyMax = product.stock != null ? product.stock : Number.MAX_SAFE_INTEGER;
  const decQty = () => setQuantity((q) => Math.max(1, q - 1));
  const incQty = () => setQuantity((q) => Math.min(qtyMax, q + 1));

  const selectVariant = (groupName: string, label: string) =>
    setVariantSelection((prev) => ({ ...prev, [groupName]: label }));

  // 评论相对时间：ISO -> i18n 文案（common.relTime.*）
  const formatRelTime = (iso: string): string => {
    const { unit, count } = getRelativeTimeUnit(iso);
    return t(`common.relTime.${unit}`, { count });
  };

  // 加购 toast 回调（addToCart / addRelatedToCart 共用，Q2 提取去重）
  const onCartSuccess = () =>
    toast.success(t('product.addedToCart', { defaultValue: 'Added to cart' }));
  const onCartError = (err: unknown) => {
    const msg =
      err instanceof Error && err.message === 'SOLD_OUT'
        ? t('product.soldOut')
        : err instanceof Error && err.message === 'STOCK_EXCEEDED'
          ? t('product.stockExceeded')
          : t('product.addToCartFailed', { defaultValue: 'Add to cart failed' });
    toast.error(msg);
  };

  const addToCart = () => {
    addToCartMutation.mutate(
      { product, quantity },
      { onSuccess: onCartSuccess, onError: onCartError },
    );
  };

  const addRelatedToCart = (p: { id: string }) => {
    const full = (allProducts ?? []).find((item) => item.id === p.id);
    if (!full) return;
    addToCartMutation.mutate(
      { product: full, quantity: 1 },
      { onSuccess: onCartSuccess, onError: onCartError },
    );
  };

  const toggleFavorite = () => {
    if (!product) return;
    toggleFavoriteMutation.mutate(product, {
      onSuccess: ({ isFavorite: fav }) =>
        toast.success(
          fav
            ? t('product.addedToFavorites', { defaultValue: 'Added to favorites' })
            : t('product.removedFromFavorites', { defaultValue: 'Removed from favorites' }),
        ),
    });
  };

  const shareProduct = () => {
    if (!product) return;
    const name = localize(product.name);
    Share.share({
      message: `${name} — $${product.price.toFixed(2)}\nCheck it out on MeiMart!`,
      title: name,
    }).catch(() => {});
  };

  const writeReview = () => {
    toast.info(t('product.reviewAfterPurchase', { defaultValue: 'You can write a review after purchasing this product' }));
  };

  return (
    <PageErrorBoundary pageName="product-detail">
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      {/* Top Bar with 4-Tab Navigation */}
      <TopBar
        activeTab={activeTab}
        onTabPress={(t) => setActiveTab(t)}
        onBack={handleBack}
        onShare={shareProduct}
        cartCount={totalItems}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Image Carousel（4:5 比例 + 分页圆点 + play 按钮） */}
        <View
          style={[styles.carousel, { backgroundColor: colors['surface-variant'], paddingTop: 0 }]}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (idx !== activeImage) setActiveImage(idx);
            }}
            scrollEventThrottle={16}
          >
            <Image
              source={{ uri: product.image }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 }}
              resizeMode="cover"
            />
            <Image
              source={{ uri: product.image }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 }}
              resizeMode="cover"
            />
            <Image
              source={{ uri: product.image }}
              style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.25 }}
              resizeMode="cover"
            />
          </ScrollView>
          {/* Pagination Dots */}
          <View style={styles.dotsWrap}>
            {[0, 1, 2].map((n) => (
              <View
                key={n}
                style={[styles.dot, n === activeImage ? [styles.dotActive, { backgroundColor: colors.primary }] : styles.dotIdle]}
              />
            ))}
          </View>
          {/* U5: 图片计数器 右下角（替原 play 按钮居中占位） */}
          <View style={styles.imageCounter} pointerEvents="none">
            <Text style={styles.imageCounterText}>
              {activeImage + 1}/3
            </Text>
          </View>
          {/* U5: Play 按钮缩到右上小尺寸（视频入口保留但不抢眼） */}
          <View style={styles.playWrap} pointerEvents="none">
            <BlurView intensity={30} tint="light" style={styles.playBtn}>
              <Icon symbol="play_arrow" size={20} color={colors['on-primary']} />
            </BlurView>
          </View>
        </View>

        {/* Content Canvas */}
        <View style={styles.canvas}>
          {/* Header Info：双标签 + 标题 + 价格 + IN STOCK */}
          <View style={styles.headerInfo}>
            <View style={styles.tagRow}>
              <View style={[styles.tagTertiary, { backgroundColor: colors['tertiary-fixed'] }]}>
                <Text
                  style={[styles.tagTertiaryText, { color: colors['on-tertiary-fixed-variant'] }]}
                >
                  {t('product.tagLocal')}
                </Text>
              </View>
              <View style={[styles.tagPrimary, { backgroundColor: colors['primary-fixed'] }]}>
                <Text style={[styles.tagPrimaryText, { color: colors.primary }]}>{t('product.badgeBestSeller')}</Text>
              </View>
            </View>
            <Text style={[styles.h1, { color: colors['on-surface'] }]}>
              {localize(product.name)}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceBig, { color: colors.primary }]}>
                ${product.price.toFixed(2)}
              </Text>
              {product.originalPrice && (
                <Text style={[styles.priceStrike, { color: colors.secondary }]}>
                  ${product.originalPrice.toFixed(2)}
                </Text>
              )}
            </View>
            {/* §7 库存 3 态：充足/未知绿点「有货」，紧张橙点「库存紧张」+ 红字仅剩；断货整块隐藏改 banner */}
            {!isSoldOut && (
              <View>
                <View
                  style={[
                    styles.stockRow,
                    {
                      borderBottomColor: colors['outline-variant'],
                      borderTopColor: colors['outline-variant'],
                    },
                  ]}
                >
                  <View style={styles.stockLeft}>
                    <View
                      style={[
                        styles.stockDot,
                        {
                          backgroundColor:
                            stockState === 'low'
                              ? colors.semantic.warning
                              : colors.semantic.positive,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.stockText,
                        {
                          color:
                            stockState === 'low'
                              ? colors.semantic.warning
                              : colors.semantic.positive,
                        },
                      ]}
                    >
                      {stockState === 'low' ? t('product.lowStock') : t('product.inStock')}
                    </Text>
                  </View>
                  {/* §9 Q3 销量：字段有值才显示，不再写死 1.2k */}
                  {product.salesCount != null && (
                    <Text style={[styles.stockSold, { color: colors['on-surface-variant'] }]}>
                      {formatCompactNumber(product.salesCount)} {t('product.sold')}
                    </Text>
                  )}
                </View>
                {/* §11.1 紧张红字提示，放在步进器上方（与步进上限视觉关联） */}
                {stockState === 'low' && (
                  <View style={styles.lowStockTip}>
                    <Text style={styles.lowStockTipIcon}>⚠</Text>
                    <Text style={[styles.lowStockTipText, { color: colors.semantic.error }]}>
                      {t('product.onlyLeft', { count: product.stock })}
                    </Text>
                  </View>
                )}
                {/* 数量步进器：+ 达 stock 禁用（§11.1），紧张态显示 / max 上限 */}
                <View style={styles.qtyRow}>
                  <View style={styles.qtyLabelWrap}>
                    <Text style={[styles.qtyLabel, { color: colors['on-surface'] }]}>
                      {t('product.quantity')}
                    </Text>
                    {stockState === 'low' && (
                      <Text style={[styles.qtyMax, { color: colors['on-surface-variant'] }]}>
                        / {t('product.stockMax', { max: product.stock })}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.stepper,
                      { borderColor: colors.outline, backgroundColor: colors['surface-container-lowest'] },
                    ]}
                  >
                    <Pressable
                      onPress={decQty}
                      disabled={quantity <= 1}
                      style={styles.stepperBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease quantity"
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: quantity <= 1 ? colors.outline : colors['on-surface'] },
                        ]}
                      >
                        −
                      </Text>
                    </Pressable>
                    <Text style={[styles.stepperVal, { color: colors['on-surface'] }]}>
                      {quantity}
                    </Text>
                    <Pressable
                      onPress={incQty}
                      disabled={quantity >= qtyMax}
                      style={styles.stepperBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Increase quantity"
                    >
                      <Text
                        style={[
                          styles.stepperBtnText,
                          { color: quantity >= qtyMax ? colors.outline : colors['on-surface'] },
                        ]}
                      >
                        +
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* §11.1 断货 banner：替代库存行 + 步进器，底部栏两键同步禁用 */}
          {isSoldOut && (
            <View
              style={[
                styles.soldOutBanner,
                { backgroundColor: colors.semantic['error-container'] },
              ]}
            >
              <Text style={styles.soldOutIcon}>📦</Text>
              <Text style={[styles.soldOutTitle, { color: colors.semantic.error }]}>
                {t('product.soldOut')}
              </Text>
              <Text style={[styles.soldOutDesc, { color: colors['on-surface-variant'] }]}>
                {t('product.soldOutDesc')}
              </Text>
            </View>
          )}

          {/* Delivery Section — §9 Q2 接入 useAddresses，取默认地址；无地址显示「选择地址」可点击跳列表 */}
          <View style={styles.section}>
            <Pressable
              onPress={() => router.push('/address/list')}
              style={[styles.deliveryCard, { backgroundColor: colors['surface-container'] }]}
              accessibilityRole="button"
              accessibilityLabel={t('product.selectAddress')}
            >
              <View style={styles.deliveryRow}>
                <View style={styles.deliveryLeft}>
                  <Icon symbol="local_shipping" size={24} color={colors.primary} />
                  <View>
                    <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>
                      {t('product.deliverTo')}
                    </Text>
                    <Text style={[styles.deliveryAddress, { color: colors['on-surface'] }]}>
                      {defaultAddr
                        ? `${defaultAddr.detail}${defaultAddr.district ? `, ${defaultAddr.district}` : ''}`
                        : t('product.selectAddress')}
                    </Text>
                  </View>
                </View>
                <Icon symbol="chevron_right" size={24} color={colors.outline} />
              </View>
              <View style={[styles.deliverySplit, { borderTopColor: colors['outline-variant'] }]}>
                <View style={styles.deliveryCell}>
                  <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>{t('product.eta')}</Text>
                  <Text style={[styles.deliveryValue, { color: colors['on-surface'] }]}>
                    Arrives Today 6:00 PM
                  </Text>
                </View>
                <View style={styles.deliveryCell}>
                  <Text style={[styles.deliveryLabel, { color: colors.secondary }]}>{t('product.shipping')}</Text>
                  <Text
                    style={[styles.deliveryValue, { color: colors.primary, fontWeight: '700' }]}
                  >
                    Free over $10
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>

          {/* §9 Q1 规格选择器：按 category 从 variantTemplates 查；无规格则整体隐藏（§11.4） */}
          {variants.length > 0 && (
            <View style={styles.section}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                  {t('product.selectVariant')}
                </Text>
              </View>
              {variants.map((group) => {
                const selectedLabel =
                  variantSelection[group.name] ?? group.options.find((o) => !o.disabled)?.label;
                return (
                  <View key={group.name} style={styles.variantGroup}>
                    <Text style={[styles.variantGroupName, { color: colors['on-surface-variant'] }]}>
                      {group.name}
                    </Text>
                    <View style={styles.grindRow}>
                      {group.options.map((opt) => {
                        const active = opt.label === selectedLabel;
                        return (
                          <Pressable
                            key={opt.label}
                            onPress={() => !opt.disabled && selectVariant(group.name, opt.label)}
                            disabled={opt.disabled}
                            style={[
                              styles.grindPill,
                              {
                                backgroundColor: active
                                  ? colors.primary
                                  : colors['surface-container-lowest'],
                                borderColor: active ? colors.primary : colors.outline,
                                opacity: opt.disabled ? 0.4 : 1,
                              },
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active, disabled: opt.disabled }}
                            accessibilityLabel={`${group.name}: ${opt.label}`}
                          >
                            <Text
                              style={[
                                styles.grindText,
                                {
                                  color: active
                                    ? colors['on-primary']
                                    : colors['on-surface-variant'],
                                  textDecorationLine: opt.disabled ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* {t('product.detailsTitle')} Section */}
          <View style={styles.section} collapsable={false}>
            <View
              style={[
            styles.detailHeader,
                { backgroundColor: 'transparent' },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('product.detailsTitle')}
              </Text>
            </View>
            <View style={[styles.detailVideo, shadowPresets.md]}>
              <Image
                source={{ uri: product.image }}
                style={styles.detailVideoImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={[styles.detailH2, { color: colors['on-surface'] }]}>
                {localize(product.name)}
              </Text>
              <Text style={[styles.detailBody, { color: colors['on-surface-variant'] }]}>
                {product.description
                  ? localize(product.description)
                  : t('product.noDescription')}
              </Text>
            </View>
          </View>

          {/* §8 评论模块 - useReviews 驱动：评分卡（count>0）/ 加载骨架 / 空态 */}
          <View style={styles.section} collapsable={false}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>{t('product.reviewsTitle')}</Text>
              {!isSoldOut && (
                <Pressable
                  onPress={writeReview}
                  style={[styles.writeReviewBtn, { borderBottomColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel="Write a review"
                >
                  <Text style={[styles.writeReviewText, { color: colors.primary }]}>
                    {t('product.writeReview')}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* 加载态：评分区淡化 + 占位 */}
            {reviewsLoading && (
              <View style={[styles.ratingSummary, { backgroundColor: colors['surface-container-low'], opacity: 0.6 }]}>
                <View style={styles.ratingSummaryLeft}>
                  <Text style={[styles.ratingBig, { color: colors['outline-variant'] }]}>—</Text>
                </View>
                <View style={[styles.ratingBars, { borderLeftColor: colors['outline-variant'] }]}>
                  {[5, 4, 3].map((s) => (
                    <View key={s} style={styles.ratingBarRow}>
                      <Text style={[styles.ratingBarLabel, { color: colors['outline-variant'] }]}>{s}</Text>
                      <View style={[styles.ratingBarTrack, { backgroundColor: colors['surface-container'] }]} />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 有评论：评分汇总卡（avg + 星 + 5 档分布）+ 评论列表 */}
            {!reviewsLoading && reviewSummary && reviewSummary.count > 0 && (
              <>
                <View style={[styles.ratingSummary, { backgroundColor: colors['surface-container-low'] }]}>
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
                              { backgroundColor: colors['tertiary-container'], width: `${r.percent}%` },
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
                      toast.info(
                        t('product.viewAllReviews', { count: reviewSummary.count }),
                      )
                    }
                    style={styles.viewAllReviewsBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t('product.viewAllReviews', { count: reviewSummary.count })}
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

          {/* {t('product.pairsWellWith')} 横滑 */}
          <View style={styles.section} collapsable={false}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('product.pairsWellWith')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {pairsWellWith.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.relatedCard,
                    { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
                  ]}
                >
                  {/* Why: 外层 View 而非 Pressable，避免 Pressable 嵌套 Pressable
                      （RN Web 渲染为 button 套 button，违反 HTML 规范导致 hydration 错误） */}
                  <Pressable
                    onPress={() => router.push(`/product/${p.id}`)}
                    style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${p.name}`}
                  >
                    <View
                      style={[styles.relatedImage, { backgroundColor: colors['surface-variant'] }]}
                    >
                      <SafeImage source={{ uri: p.image }} style={styles.relatedImg} />
                    </View>
                    <View style={styles.relatedInfo}>
                      <Text
                        style={[styles.relatedName, { color: colors['on-surface'] }]}
                        numberOfLines={1}
                      >
                        {localize(p.name)}
                      </Text>
                      <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                        ${p.price.toFixed(2)}
                      </Text>
                    </View>
                  </Pressable>
                  <View style={styles.relatedAddWrap}>
                    <Pressable
                      onPress={() => addRelatedToCart(p)}
                      style={({ pressed }) => [
                        styles.relatedAddBtn,
                        { borderColor: colors.primary },
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${p.name} to cart`}
                    >
                      <Text style={[styles.relatedAddText, { color: colors.primary }]}>
                        {t('product.addToCart')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* {t('product.relatedProducts')} 横滑 */}
          <View
            style={[
              styles.section,
              { borderTopColor: colors['outline-variant'], borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('product.relatedProducts')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {youMayLike.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/product/${p.id}`)}
                  style={({ pressed }) => [
                    styles.relatedCard,
                    { backgroundColor: colors['surface-container-lowest'], borderColor: colors['outline-variant'] },
                    pressed && { opacity: 0.85 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${p.name}`}
                >
                  <View
                    style={[styles.relatedImage, { backgroundColor: colors['surface-variant'] }]}
                  >
                    <SafeImage source={{ uri: p.image }} style={styles.relatedImg} />
                  </View>
                  <View style={styles.relatedInfo}>
                    <Text
                      style={[styles.relatedName, { color: colors['on-surface'] }]}
                      numberOfLines={1}
                    >
                      {localize(p.name)}
                    </Text>
                    <Text style={[styles.relatedPrice, { color: colors.primary }]}>
                      ${p.price.toFixed(2)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions — U4 三键：收藏(48px) + 立即购买(flex:1描边) + 加购(flex:1) */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        <Pressable
          onPress={toggleFavorite}
          style={({ pressed }) => [styles.favoriteBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          accessibilityState={{ selected: isFavorite }}
        >
          <Icon
            name={isFavorite ? 'star' : 'star-outline'}
            size={32}
            color={isFavorite ? colors.primary : colors['on-surface']}
          />
          <Text
            style={[
              styles.favoriteText,
              { color: isFavorite ? colors.primary : colors['on-surface'] },
            ]}
          >
            {t('product.favorite')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            // Why: 立即购买 = 加购该商品 + 跳结算（addToCart 乐观更新 cart 缓存，checkout 立即看到）
            addToCart();
            router.push('/order/checkout');
          }}
          disabled={isSoldOut}
          style={({ pressed }) => [
            styles.buyNowBtn,
            {
              borderColor: isSoldOut ? colors['outline-variant'] : colors.primary,
              backgroundColor: isSoldOut ? colors['surface-container-low'] : 'transparent',
            },
            pressed && !isSoldOut && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('product.buyNow')}
          accessibilityState={{ disabled: isSoldOut }}
        >
          <Text
            style={[
              styles.buyNowText,
              { color: isSoldOut ? colors['on-surface-variant'] : colors.primary },
            ]}
          >
            {t('product.buyNow')}
          </Text>
        </Pressable>
        <Pressable
          onPress={addToCart}
          disabled={isSoldOut}
          style={({ pressed }) => [
            styles.cartBtn,
            {
              backgroundColor: isSoldOut
                ? colors['surface-container-low']
                : colors['primary-container'],
            },
            pressed && !isSoldOut && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add to cart"
          accessibilityState={{ disabled: isSoldOut }}
        >
          <Text
            style={[
              styles.cartBtnText,
              { color: isSoldOut ? colors['on-surface-variant'] : colors['on-primary-container'] },
            ]}
          >
            {t('product.addToCart')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

// §8 评论卡 - 头像首字母 + 名 + 星 + 相对时间 + 正文 + 图 + 标签 + verified（提取为组件便于独立渲染）
function ReviewCard({
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
  const initial = (review.userName.trim()[0] ?? '?').toUpperCase();
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
            <Text style={[styles.reviewName, { color: colors['on-surface'] }]}>
              {review.userName}
            </Text>
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

// 顶部 4-Tab 导航
function TopBar({
  activeTab,
  onTabPress,
  onBack,
  onShare,
  cartCount = 0,
}: {
  activeTab: TabKey;
  onTabPress: (t: TabKey) => void;
  onBack: () => void;
  onShare?: () => void;
  cartCount?: number;
}) {
  const { colors } = useTheme();
  const { t: translate } = useTranslation();

  return (
    <View
      style={[
        styles.topBar,
        { backgroundColor: colors['surface-container-lowest'], borderBottomColor: colors['outline-variant'] },
      ]}
    >
      <Pressable
        onPress={onBack}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon symbol="arrow_back" size={24} color={colors['on-surface']} />
      </Pressable>
      <ScrollView
        style={styles.tabsWrap}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((t) => {
          const isActive = t === activeTab;
          return (
            <Pressable
              key={t}
              onPress={() => onTabPress(t)}
              style={[styles.tabBtn, isActive && { borderBottomColor: colors.primary }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.primary : colors['on-surface-variant'],
                  },
                ]}
              >
                {translate(`product.tab.${t.toLowerCase()}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={onShare ?? (() => {})}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel="Share"
      >
        <Icon symbol="share" size={24} color={colors['on-surface']} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/cart')}
        hitSlop={8}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel="Shopping cart"
      >
        <Icon symbol="shopping_cart" size={24} color={colors['primary-container']} />
        {cartCount > 0 && (
          <View style={styles.cartBadge} accessibilityLabel={`${cartCount} items in cart`}>
            <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#dc2626', // 原因：断货 badge 红（HTML out-of-stock red-600），与 semantic.error 色阶不同
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cartBadgeText: {
    // 原因：购物车角标红底(#dc2626)白字，固定对比色，dark 不变
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabsWrap: {
    flex: 1,
  },
  tabsContent: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  tabBtn: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  carousel: {
    position: 'relative',
  },
  dotsWrap: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
  },
  dotIdle: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  playWrap: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageCounter: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageCounterText: {
    // 原因：图片计数器黑底(rgba(0,0,0,0.5))白字，固定对比色，dark 不变
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  canvas: {
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  headerInfo: {
    gap: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tagTertiary: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  tagTertiaryText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  tagPrimary: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
  },
  tagPrimaryText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  h1: {
    ...typography.h1,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  priceBig: {
    ...typography['price-display'],
    fontSize: 28,
    lineHeight: 28 * 1.2,
    flexShrink: 0,
  },
  priceStrike: {
    ...typography['body-sm'],
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    // Why: 颜色按库存态内联（充足/未知=positive，紧张=warning），不再硬编码 #15803d
  },
  stockText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  stockSold: {
    ...typography['body-sm'],
  },
  // §11.1 紧张提示（步进器上方）
  lowStockTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  lowStockTipIcon: {
    fontSize: 14,
  },
  lowStockTipText: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  // 数量步进器
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  qtyLabelWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  qtyLabel: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
  qtyMax: {
    ...typography['body-sm'],
    fontSize: 11,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepperVal: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  // §11.1 断货 banner
  soldOutBanner: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: 4,
  },
  soldOutIcon: {
    fontSize: 28,
  },
  soldOutTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  soldOutDesc: {
    ...typography['body-sm'],
    textAlign: 'center',
  },
  // 规格组容器
  variantGroup: {
    gap: spacing.xs,
  },
  variantGroupName: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  section: {
    gap: spacing.md,
  },
  deliveryCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deliveryLabel: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  deliveryAddress: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  deliverySplit: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deliveryCell: {
    flex: 1,
    gap: 2,
  },
  deliveryValue: {
    ...typography['body-sm'],
  },
  sectionTitle: {
    ...typography.h3,
    fontWeight: '600',
  },
  titleUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: '66%',
    height: 4,
  },
  titleUnderline2: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: '50%',
    height: 4,
  },
  grindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  grindPill: {
    flexGrow: 1,
    flexBasis: '30%',
    paddingVertical: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  grindText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  detailHeader: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailVideoImg: {
    width: '100%',
    height: '100%',
  },
  detailTextWrap: {
    gap: spacing.md,
  },
  detailH2: {
    ...typography.h2,
    fontWeight: '700',
  },
  detailBody: {
    ...typography['body-md'],
    lineHeight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 48,
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
    height: 8,
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
  hScroll: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  relatedCard: {
    width: 160,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  relatedImage: {
    height: 128,
  },
  relatedImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  relatedInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  relatedAddWrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  relatedName: {
    ...typography['body-sm'],
    fontWeight: '700',
  },
  relatedPrice: {
    ...typography['price-display'],
    fontSize: 16,
  },
  relatedAddBtn: {
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 2,
  },
  relatedAddText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout['container-margin'],
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  favoriteBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  favoriteText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  buyNowBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    ...typography['label-caps'],
    fontSize: 14,
    fontWeight: '700',
  },
  cartBtn: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtnText: {
    ...typography['label-caps'],
    fontSize: 14,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
