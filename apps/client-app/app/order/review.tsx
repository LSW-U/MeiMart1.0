// HTML 原型：第三梯队HTML原型设计/P15-售后评价页-优化原型.html（2026-08-10 出）
// OrderReviewPage — 订单评价（P15 优化：星级滑动 + 匿名开关 + 图片上传 + 字数统计）
// D.4: PrimaryHeader + 商品卡片 + 5 星 emoji 评分 + 标签 Chip + 评价文本 + 照片上传 + 提交按钮
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useNetwork } from '@/hooks/useNetwork';
import { useTranslation } from 'react-i18next';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Chip } from '@/components/ui/Chip';
import { Switch } from '@/components/ui/Switch';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import { PriceText } from '@/components/ui/PriceText';
import { useOrder } from '@/services/queries/useOrders';
import { useSubmitReview } from '@/services/queries/useReviews';
import { uploadsApi } from '@/services/uploads';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { reviewSchema, type ReviewValues } from '@/forms/schemas/service';

// Why: TAGS 用 i18n key 渲染 Chip，提交时需还原为存储标识（quality/fresh 等，与 reviews.json 对齐）
const REVIEW_TAG_PREFIX = 'review.tag.';
// Why: 与后端 GoodsReviewTag 枚举对齐（snake_case，RB1 commit 9e33d79），
//      real POST tags 不匹配枚举会 400。商品详情页 product/[id].tsx:992 同用 review.tag.${tag} 渲染。
const TAGS = [
  `${REVIEW_TAG_PREFIX}good_quality`,
  `${REVIEW_TAG_PREFIX}good_price`,
  `${REVIEW_TAG_PREFIX}fresh`,
  `${REVIEW_TAG_PREFIX}well_packaged`,
  `${REVIEW_TAG_PREFIX}accurate_description`,
  `${REVIEW_TAG_PREFIX}fast_delivery`,
];

const RATING_KEYS = [
  'review.rating.terrible',
  'review.rating.bad',
  'review.rating.okay',
  'review.rating.good',
  'review.rating.great',
];

const RATING_EMOJI = ['😞', '😕', '😐', '🙂', '😍'];

// 原因：提交按钮固定白字。两种模式都是品牌红底，白字正确不变。
// 不可用 colors['on-primary']：dark 模式下翻为暗红，叠红底会裂色（同 cart.tsx ON_PRIMARY / P2）。
const ON_PRIMARY = '#ffffff';

export default function OrderReviewPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const localize = useLocalizer();
  // Why: §8 评论模块 - 订单详情跳转时传 id(orderId) + productId（初始选中商品，方案 C 多商品切换）。
  //      orderId 是后端 POST /orders/:orderId/review 路径参数（real 必填，空时 submit 兜底阻止）；
  //      productId 用于初始选中 tab，多商品订单可顶部切换逐条评价（selectProduct reset 表单不串数据）。
  const { productId: productIdParam, id: orderIdParam } = useLocalSearchParams<{
    productId?: string;
    id?: string;
  }>();
  const orderId = orderIdParam ?? '';
  // 方案 C（多商品逐条评价）：useOrder 取全部商品，selectedProductId 切换当前评价商品。
  // 单商品订单不显切换 tab；多商品订单顶部 tab 切换，每商品独立评价（切换 reset 表单不串数据）。
  const { data: order } = useOrder(orderId);
  const orderItems = order?.items ?? [];
  const [selectedProductId, setSelectedProductId] = useState<string>(productIdParam ?? '');
  const currentProductId =
    selectedProductId || orderItems[0]?.product.id || productIdParam || 'p001';
  const currentItem = orderItems.find((i) => i.product.id === currentProductId);
  const product = currentItem?.product;
  const submitReviewMutation = useSubmitReview();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { control, handleSubmit, setValue, reset } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, content: '', anonymous: false },
    mode: 'onBlur',
  });

  // 切换商品：reset 表单 + 清 tags（每商品独立评价，不串上次数据）
  const selectProduct = (pid: string) => {
    if (pid === currentProductId) return;
    setSelectedProductId(pid);
    reset({ rating: 5, content: '', anonymous: false, images: [] });
    setSelectedTags([]);
  };
  const ratingValue = useWatch({ control, name: 'rating' }) as number;
  const STAR_ACTIVE = '#f59e0b'; // 原因：评分星标金色（HTML star gold amber-500），semantic 无对应角色

  // 决策 4a：星级滑动选择（PanResponder + Haptics + Animated）
  // ratingRef 存最新值避免闭包陷阱（PanResponder 回调在 event 触发时读 ref，不依赖 render 闭包）
  // 用 useEffect 同步 ref（react-hooks/refs 禁止 render 阶段写 ref.current）
  const ratingRef = useRef(ratingValue);
  useEffect(() => {
    ratingRef.current = ratingValue;
  }, [ratingValue]);
  const starsLayoutRef = useRef(0); // 星级区域宽度（onLayout 回调写入）
  // scaleAnim 用 useState 初始化函数（避免 useRef(...).current 在 render 阶段访问 ref 触发 react-hooks/refs）
  const [scaleAnim] = useState(() => new Animated.Value(1));

  // 纯函数：手指 x 坐标 → 星级 1-5（不访问 ref，可安全传入 useMemo 不触发 react-hooks/refs）
  const computeStar = useCallback((x: number, layoutWidth: number): number => {
    if (layoutWidth <= 0) return 0;
    return Math.max(1, Math.min(5, Math.ceil((x / layoutWidth) * 5)));
  }, []);

  // PanResponder 用 useMemo 创建（依赖 computeStar 纯函数 + stable setValue/scaleAnim）
  // ref.current 访问全部在 event 回调（onPanResponderGrant/Move）内，event 触发时执行非 render 阶段
  /* eslint-disable react-hooks/refs -- 原因：onPanResponderGrant/Move 是 event 回调（手势触发时执行），其内的 ratingRef/starsLayoutRef.current 访问不在 render 阶段；react-hooks/refs 静态分析无法区分 event 回调与 render 函数体，对 RN PanResponder + ref 标准模式误报 */
  const starsPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const star = computeStar(e.nativeEvent.locationX, starsLayoutRef.current);
          if (star > 0 && star !== ratingRef.current) {
            Haptics.selectionAsync();
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
            ]).start();
            setValue('rating', star, { shouldValidate: true });
          }
        },
        onPanResponderMove: (e) => {
          const star = computeStar(e.nativeEvent.locationX, starsLayoutRef.current);
          if (star > 0 && star !== ratingRef.current) {
            Haptics.selectionAsync();
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.15, duration: 80, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
            ]).start();
            setValue('rating', star, { shouldValidate: true });
          }
        },
      }),
    [computeStar, setValue, scaleAnim],
  );
  /* eslint-enable react-hooks/refs */

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((tk) => tk !== tag) : [...prev, tag],
    );
  };

  const { isOffline } = useNetwork();
  const [uploading, setUploading] = useState(false);

  // 决策 3（B3/R3）+ RB2：图片上传 expo-image-picker -> uploadsApi.reviewImage 拿 URL -> 存 URL
  // RB2 端点（POST /client/uploads/review-image）就绪后上传拿 MinIO URL，submit 时传后端可访问
  const handleAddPhoto = async (
    currentImages: string[],
    onChange: (v: string[]) => void,
  ) => {
    const MAX = 3;
    if (currentImages.length >= MAX) return;
    if (isOffline) {
      toast.info(t('review.photoOfflineTip'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX - currentImages.length,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      // 逐张上传 review-image 端点拿 URL，存 URL（不再存本地 URI）
      const uploaded = await Promise.all(
        result.assets.map((a) =>
          uploadsApi.reviewImage(a.uri, a.mimeType ?? 'image/jpeg'),
        ),
      );
      const newUrls = uploaded.map((r) => r.url);
      onChange([...currentImages, ...newUrls].slice(0, MAX));
    } catch {
      toast.error(t('review.photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  // Why: §8 提交接 useSubmitReview（乐观写入 reviews 缓存 -> 详情页立即可见 + 绿色置顶）。
  //      category='PRODUCT'（本页是商品评论入口）；orderId 缺省时 real 模式会 404（URL //review）。
  const submit = handleSubmit((values) => {
    if (!orderId) {
      // 防漏传：profile 等入口未带 orderId 时阻止提交（应跳订单列表选订单，不直接进 review 页）
      toast.error(t('review.missingOrder'));
      return;
    }
    submitReviewMutation.mutate(
      {
        orderId,
        productId: currentProductId,
        category: 'PRODUCT',
        rating: values.rating,
        content: values.content,
        tags: selectedTags.map((tk) => tk.replace(REVIEW_TAG_PREFIX, '')),
        images: values.images,
        anonymous: values.anonymous ?? false,
      },
      {
        onSuccess: () => {
          toast.success(t('review.successDesc'));
          handleBack();
        },
        onError: () =>
          toast.error(t('review.submitFailed', { defaultValue: 'Submit failed, please retry' })),
      },
    );
  });

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader title={t('review.title')} showBack onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 多商品切换 tab（方案 C：单商品订单不显，多商品订单顶部切换逐条评价，切换 reset 表单） */}
        {orderItems.length > 1 && (
          <View style={styles.productTabs}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productTabsScroll}
            >
              {orderItems.map((it) => {
                const active = it.product.id === currentProductId;
                return (
                  <Pressable
                    key={it.product.id}
                    onPress={() => selectProduct(it.product.id)}
                    style={[
                      styles.productTab,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors['surface-container-low'],
                        borderColor: active ? colors.primary : colors['outline-variant'],
                      },
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={localize(it.product.name)}
                  >
                    <Image
                      source={{
                        uri:
                          it.product.image ||
                          'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=100',
                      }}
                      style={styles.productTabImg}
                    />
                    <Text
                      style={[
                        styles.productTabName,
                        { color: active ? ON_PRIMARY : colors['on-surface-variant'] },
                      ]}
                      numberOfLines={1}
                    >
                      {localize(it.product.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 商品卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.cardPattern} pointerEvents="none">
            <TaisPattern width={400} height={60} opacity={0.15} />
          </View>
          <View style={styles.productRow}>
            <View style={[styles.productImgWrap, { backgroundColor: colors['surface-container'] }]}>
              <Image
                source={{
                  uri: product?.image ?? 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
                }}
                style={styles.productImg}
                resizeMode="cover"
              />
            </View>
            <View style={styles.productTextBox}>
              <Text style={[styles.productName, { color: colors['on-surface'] }]} numberOfLines={2}>
                {product ? localize(product.name) : t('review.mockProductName')}
              </Text>
              <View style={styles.productMetaRow}>
                <Text style={[styles.productMeta, { color: colors['on-surface-variant'] }]}>
                  × 1
                </Text>
                <PriceText value={product?.price ?? 0} size="md" />
              </View>
            </View>
          </View>
        </View>

        {/* 评分卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('review.productRating')}
          </Text>

          <View style={[styles.ratingBox, { backgroundColor: colors['surface-container-low'] }]}>
            <Text style={styles.ratingEmoji}>{RATING_EMOJI[ratingValue - 1]}</Text>
            <View
              style={styles.starsRow}
              onLayout={(e) => (starsLayoutRef.current = e.nativeEvent.layout.width)}
              {...starsPanResponder.panHandlers}
              accessibilityRole="adjustable"
              accessibilityLabel={t('review.a11y.ratingSlider')}
              accessibilityValue={{ min: 1, max: 5, now: ratingValue }}
              testID="review-rating-slider"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Animated.View key={n} style={{ transform: [{ scale: scaleAnim }] }}>
                  <Icon
                    symbol="star_rate"
                    size={32}
                    color={n <= ratingValue ? STAR_ACTIVE : colors['outline-variant']}
                  />
                </Animated.View>
              ))}
            </View>
            <Text style={[styles.ratingLabel, { color: colors.primary }]}>
              {t(RATING_KEYS[ratingValue - 1])}
            </Text>
          </View>
        </View>

        {/* 评价内容卡片 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.label, { color: colors['on-surface'] }]}>
            {t('review.contentLabel')}
          </Text>
          <Controller
            control={control}
            name="content"
            render={({ field: { value, onChange }, fieldState: { error } }) => {
              // 决策 5：textarea 字数统计（schema max 500，UI 显示进度，>450 提示接近上限）
              const len = value?.length ?? 0;
              return (
                <>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder={t('review.placeholder')}
                    placeholderTextColor={colors['on-surface-variant']}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    style={[
                      styles.textarea,
                      {
                        color: colors['on-surface'],
                        backgroundColor: colors['surface-container-low'],
                        borderColor: error ? colors.error : colors['outline-variant'],
                      },
                    ]}
                    testID="review-content"
                  />
                  {/* 字数统计行：左 error 文案（无则占位），右 N/500（>450 变 error 色） */}
                  <View style={styles.textareaMetaRow}>
                    {error?.message ? (
                      <Text
                        style={[styles.errorText, { color: colors.error }]}
                        accessibilityRole="alert"
                      >
                        {error.message}
                      </Text>
                    ) : (
                      <View />
                    )}
                    <Text
                      style={[
                        styles.charCount,
                        { color: len > 450 ? colors.error : colors['on-surface-variant'] },
                      ]}
                      accessibilityLabel={t('review.a11y.charCount', { count: len, max: 500 })}
                    >
                      {len} / 500
                    </Text>
                  </View>
                </>
              );
            }}
          />

          {/* 标签 Chip 区 */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('review.tagsLabel', { defaultValue: 'Quick tags' })}
          </Text>
          <View style={styles.tagsRow}>
            {TAGS.map((tagKey) => {
              const active = selectedTags.includes(tagKey);
              return (
                <Chip
                  key={tagKey}
                  label={t(tagKey)}
                  selected={active}
                  onSelect={() => toggleTag(tagKey)}
                />
              );
            })}
          </View>

          {/* 照片上传（决策 3：接 expo-image-picker + 缩略图 + 删除 + N/3 计数） */}
          <Text style={[styles.subLabel, { color: colors['on-surface-variant'] }]}>
            {t('review.photosLabel')}
          </Text>
          <Controller
            control={control}
            name="images"
            render={({ field: { value, onChange } }) => {
              const imgs = value ?? [];
              return (
                <View style={styles.photosRow}>
                  {imgs.map((uri, index) => (
                    <View key={uri} style={styles.photoThumb}>
                      <Image
                        source={{ uri }}
                        style={styles.photoThumbImg}
                        resizeMode="cover"
                        accessibilityLabel={t('review.a11y.photoThumb', { count: index + 1 })}
                      />
                      <Pressable
                        onPress={() => onChange(imgs.filter((_, i) => i !== index))}
                        style={[
                          styles.photoRemoveBtn,
                          { backgroundColor: colors['surface-container-high'] },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={t('review.a11y.removePhoto', { count: index + 1 })}
                        hitSlop={8}
                        testID={`review-remove-photo-${index}`}
                      >
                        <Icon symbol="close" size={14} color={colors['on-surface']} />
                      </Pressable>
                    </View>
                  ))}
                  {imgs.length < 3 && (
                    <Pressable
                      style={[
                        styles.photoAddBtn,
                        {
                          backgroundColor: colors['surface-container-low'],
                          borderColor: colors['outline-variant'],
                          opacity: uploading ? 0.5 : 1,
                        },
                      ]}
                      onPress={() => handleAddPhoto(imgs, onChange)}
                      disabled={uploading}
                      accessibilityRole="button"
                      accessibilityLabel={t('review.a11y.addPhoto')}
                      accessibilityState={{ disabled: uploading }}
                      testID="review-add-photo"
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color={colors['on-surface-variant']} />
                      ) : (
                        <Icon
                          symbol="photo_camera"
                          size={22}
                          color={colors['on-surface-variant']}
                        />
                      )}
                      <Text style={[styles.photoAddText, { color: colors['on-surface-variant'] }]}>
                        {imgs.length} / 3
                      </Text>
                    </Pressable>
                  )}
                </View>
              );
            }}
          />
        </View>

        {/* 匿名评价开关（决策 2：接 Controller + Switch，B2 死 UI 修复） */}
        <Controller
          control={control}
          name="anonymous"
          render={({ field: { value, onChange } }) => (
            <View
              style={[
                styles.anonCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
                shadowPresets.sm,
              ]}
            >
              <View style={styles.anonTextBox}>
                <Icon symbol="visibility_off" size={18} color={colors['on-surface-variant']} />
                <View>
                  <Text style={[styles.anonTitle, { color: colors['on-surface'] }]}>
                    {t('review.anonymousTitle')}
                  </Text>
                  <Text style={[styles.anonDesc, { color: colors['on-surface-variant'] }]}>
                    {t('review.anonymousDesc')}
                  </Text>
                </View>
              </View>
              <Switch
                value={value ?? false}
                onValueChange={onChange}
                testID="review-anonymous"
              />
            </View>
          )}
        />
      </ScrollView>

      {/* 底部提交按钮 */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
          shadowPresets.md,
        ]}
      >
        <Pressable
          onPress={submit}
          disabled={submitReviewMutation.isPending}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              // 决策 6：统一 primary 底（不再 pending 变灰），用 spinner + 文案变化反馈 loading
              backgroundColor: colors.primary,
            },
            pressed && !submitReviewMutation.isPending && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            submitReviewMutation.isPending ? t('review.submitting') : t('review.submit')
          }
          accessibilityState={{ disabled: submitReviewMutation.isPending }}
          testID="review-submit"
        >
          <View style={styles.submitContent}>
            {submitReviewMutation.isPending && (
              <ActivityIndicator size="small" color={ON_PRIMARY} />
            )}
            {/* 决策 8（Commit 2 TODO 实现）：两种态统一 ON_PRIMARY，不再 isPending 条件 */}
            <Text style={[styles.submitText, { color: ON_PRIMARY }]}>
              {submitReviewMutation.isPending ? t('review.submitting') : t('review.submit')}
            </Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: layout['container-margin'],
    paddingBottom: 120,
    gap: spacing.md,
  },
  // 方案 C：多商品切换 tab（顶部横滑，缩略图 + 商品名，选中态 primary 底）
  productTabs: {
    marginHorizontal: -spacing.xs, // 让横滑两端对齐 container
  },
  productTabsScroll: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  productTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 200,
  },
  productTabImg: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
  },
  productTabName: {
    ...typography['body-sm'],
    fontWeight: '600',
    flexShrink: 1,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    zIndex: 2,
  },
  productImgWrap: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productTextBox: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography['body-md'],
    fontWeight: '600',
    lineHeight: 18,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  productMeta: {
    ...typography['body-sm'],
  },
  label: {
    ...typography['body-md'],
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subLabel: {
    ...typography['label-caps'],
    fontSize: 11,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  ratingBox: {
    alignItems: 'center',
    gap: spacing.xs, // 决策 4：收紧（原 spacing.sm），emoji/星标/文案紧贴
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  ratingEmoji: {
    fontSize: 36, // 决策 4/R6：40→36，与星标视觉层级协调
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm, // 决策 4a：手势区域上下扩大触摸区
    paddingHorizontal: spacing.md,
  },
  ratingLabel: {
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 12,
  },
  textarea: {
    minHeight: 100,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    ...typography['body-md'],
  },
  // 决策 5：字数统计行（左 error / 右 N/500）
  textareaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  charCount: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  errorText: {
    ...typography['body-sm'],
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // 决策 3：已选图片缩略图（72x72，与 photoAddBtn 等大）
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddBtn: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAddText: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  anonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  anonTextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  anonTitle: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
  anonDesc: {
    ...typography['label-caps'],
    fontSize: 10,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  submitBtn: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  // 决策 6：spinner + 文案横排
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  submitText: {
    // color 由 JSX inline 设为 ON_PRIMARY（决策 6/8 统一两种态，不再 isPending 条件）
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
});
