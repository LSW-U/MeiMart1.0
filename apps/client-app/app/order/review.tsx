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
import { useSubmitReview, useOrderReviews } from '@/services/queries/useReviews';
import { uploadsApi } from '@/services/uploads';
import { PhotoUploadTile } from '@/components/ui/PhotoUploadTile';
import {
  createSlot,
  slotToUploading,
  slotToDone,
  slotToError,
  precheckImage,
  PrecheckError,
  type UploadSlot,
} from '@meimart/upload-core';
import { useLocalizer } from '@/i18n';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
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
  // P15 多商品：已评商品集合（APPROVED/PENDING 算已评 -> tab 灰色禁用；REJECTED 可重评）
  // GET /orders/:id/reviews 失败时降级 orderReviews=[] -> 不显已评标记，用户仍可提交（后端 E-REVIEW-003 兜底）
  const { data: orderReviews } = useOrderReviews(orderId);
  const reviewedProductIds = useMemo(
    () =>
      new Set(
        (orderReviews ?? [])
          .filter((r) => r.status === 'APPROVED' || r.status === 'PENDING')
          .map((r) => r.productId)
          .filter(Boolean),
      ),
    [orderReviews],
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(productIdParam ?? '');
  // currentProductId 优先首个未评商品（已评商品灰色禁用，自动落到下一个待评商品）
  const firstUnreviewedId = orderItems.find((i) => !reviewedProductIds.has(i.product.id))?.product
    .id;
  const currentProductId =
    selectedProductId || firstUnreviewedId || orderItems[0]?.product.id || productIdParam || 'p001';
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
  // Why 保留 disable 范围指令（改动2 自审实测报告 Unused eslint-disable）： PanResponder.create
  // 的回调体在本 lint 版本未命中 react-hooks/refs（规则对 useMemo+create 工厂内的 ref 访问不判），
  // 但 ratingRef/starsLayoutRef 语义上确属「event 回调访问 ref」模式，指令作为意图标注保留——
  // 规则升级命中时即自动生效，避免届时静默报错
  // Why 无 eslint-disable react-hooks/refs 指令（批B 收尾二分实测）：PanResponder.create 回调体内的
  // ratingRef/starsLayoutRef.current 访问在本配置（eslint-plugin-react-hooks 7.1.1）不被该规则命中——
  // 规则对 useMemo+PanResponder.create 工厂内的 event 回调不判违规；且实测 uploadOne 的
  // 「catch 内 setSlots」模式会使规则对该文件整体降级（指令反报 Unused）。语义上这些 ref 访问
  // 均在 event 回调（手势触发）执行、非 render 阶段，本就合规。若未来重构移除 setState-in-catch
  // 模式后规则报此区块违规，再按当时报错补范围指令。
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((tk) => tk !== tag) : [...prev, tag],
    );
  };

  const { isOffline } = useNetwork();
  const [uploading, setUploading] = useState(false);
  // 批B（U3/U4）：图片位状态机——多选上传逐张建 slot，失败保留本地预览可重试
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  // Why: Controller render 回调闭包里读 slots 会拿到旧值（rerender 不换 render 闭包时），
  //      ref 镜像最新值供 handleAddPhoto/handleRetrySlot 计数与重试取 URI
  const slotsRef = useRef<UploadSlot[]>([]);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // 批B A4 预校验（generic：≥100×100 任意比例 + ≤5MB）+ 单张上传并落 slot
  const uploadOne = async (asset: ImagePicker.ImagePickerAsset, slotId: string) => {
    try {
      precheckImage('generic', {
        mimeType: asset.mimeType,
        sizeBytes: asset.fileSize ?? null,
        width: asset.width ?? 0,
        height: asset.height ?? 0,
      });
    } catch (err) {
      if (err instanceof PrecheckError) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...slotToError(s, err), errorKind: 'business' as const } : s,
          ),
        );
        toast.error(t(`errors.${err.code}`, { defaultValue: err.message }));
        return null;
      }
      throw err;
    }
    try {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? slotToUploading(s) : s)));
      const uploaded = await uploadsApi.reviewImage(asset.uri, asset.mimeType ?? 'image/jpeg');
      setSlots((prev) => prev.map((s) => (s.id === slotId ? slotToDone(s, uploaded.url) : s)));
      return uploaded.url;
    } catch (err) {
      setSlots((prev) => prev.map((s) => (s.id === slotId ? slotToError(s, err) : s)));
      toast.error(t('review.photoUploadFailed'));
      return null;
    }
  };

  // U4 手动重试：error 态 slot 用保留的 localUri 重新上传
  const handleRetrySlot = async (
    slotId: string,
    onChange: (v: string[]) => void,
    current: string[],
  ) => {
    const target = slotsRef.current.find((s) => s.id === slotId);
    if (!target?.localUri || uploading) return;
    const url = await uploadOne({ uri: target.localUri } as ImagePicker.ImagePickerAsset, slotId);
    if (url) onChange([...current, url].slice(0, 3));
  };

  // 决策 3（B3/R3）+ RB2：图片上传 expo-image-picker -> 预校验（批B A4）-> uploadsApi.reviewImage 拿 URL -> 存 URL
  // RB2 端点（POST /client/uploads/review-image）就绪后上传拿 MinIO URL，submit 时传后端可访问
  // 批B（U3/U4）：多选逐张建 slot（本地预览+拟真进度+失败可重试），成功的 URL 进表单 images
  const handleAddPhoto = async (currentImages: string[], onChange: (v: string[]) => void) => {
    const MAX = 3;
    const pending = slotsRef.current.filter((s) => s.state === 'error').length;
    if (currentImages.length + pending >= MAX) return;
    if (isOffline) {
      toast.info(t('review.photoOfflineTip'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX - currentImages.length - pending,
      quality: 0.8,
    });
    if (result.canceled) return;
    setUploading(true);
    // 逐张建 slot（本地预览立即可见）再并发上传
    const newSlots = result.assets.map((a, i) => createSlot(`review-${Date.now()}-${i}`, a.uri));
    setSlots((prev) => [...prev, ...newSlots]);
    const uploaded = await Promise.all(result.assets.map((a, i) => uploadOne(a, newSlots[i].id)));
    const newUrls = uploaded.filter((u): u is string => u !== null);
    onChange([...currentImages, ...newUrls].slice(0, MAX));
    setUploading(false);
  };

  // Why: §8 提交接 useSubmitReview（乐观写入 reviews 缓存 -> 详情页立即可见 + 绿色置顶）。
  //      category='PRODUCT'（本页是商品评论入口）；orderId 缺省时 real 模式会 404（URL //review）。
  const submit = handleSubmit((values) => {
    if (!orderId) {
      // 防漏传：profile 等入口未带 orderId 时阻止提交（应跳订单列表选订单，不直接进 review 页）
      toast.error(t('review.missingOrder'));
      return;
    }
    if (reviewedProductIds.has(currentProductId)) {
      // P15 多商品：已评商品（APPROVED/PENDING）前端预拦，后端 E-REVIEW-003 兜底
      toast.error(t('review.alreadyReviewed'));
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
        onError: (err) => {
          // 后端 E-REVIEW-003（该商品已评价）等，getApiErrorMessage 提取后端 message
          toast.error(getApiErrorMessage(err, t('review.submitFailed')));
        },
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
          <>
            {/* V18：显式进度提示（原型 info-c 蓝底条「已完成 1/3」，tab 仅隐含进度） */}
            <View
              style={[
                styles.reviewProgressRow,
                { backgroundColor: colors.semantic['info-container'] },
              ]}
            >
              <Icon symbol="info" size={14} color={colors.semantic.info} />
              <Text style={[styles.reviewProgressText, { color: colors.semantic.info }]}>
                {t('review.progressHint', {
                  done: reviewedProductIds.size,
                  total: orderItems.length,
                })}
              </Text>
            </View>
            <View style={styles.productTabs}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productTabsScroll}
              >
                {orderItems.map((it) => {
                  const active = it.product.id === currentProductId;
                  // 已评商品（APPROVED/PENDING）灰色禁用 + 已评 badge；REJECTED 可重评（reviewed=false）
                  const reviewed = reviewedProductIds.has(it.product.id);
                  return (
                    <Pressable
                      key={it.product.id}
                      onPress={() => !reviewed && selectProduct(it.product.id)}
                      disabled={reviewed}
                      style={[
                        styles.productTab,
                        {
                          backgroundColor: reviewed
                            ? colors['surface-container']
                            : active
                              ? colors.primary
                              : colors['surface-container-low'],
                          borderColor: reviewed
                            ? colors['outline-variant']
                            : active
                              ? colors.primary
                              : colors['outline-variant'],
                          opacity: reviewed ? 0.5 : 1,
                        },
                      ]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active, disabled: reviewed }}
                      accessibilityLabel={`${localize(it.product.name)}${reviewed ? ` ${t('review.reviewedBadge')}` : ''}`}
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
                          {
                            color: reviewed
                              ? colors['on-surface-variant']
                              : active
                                ? ON_PRIMARY
                                : colors['on-surface-variant'],
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {localize(it.product.name)}
                      </Text>
                      {reviewed && (
                        <View
                          style={[
                            styles.reviewedBadge,
                            { backgroundColor: colors.semantic.positive },
                          ]}
                        >
                          <Icon symbol="check" size={10} color={ON_PRIMARY} />
                          <Text style={styles.reviewedBadgeText}>{t('review.reviewedBadge')}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </>
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
                  uri:
                    product?.image ??
                    'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200',
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
              // 批B U3/U4：slot 三态渲染（uploading/done/error）+ 空位添加钮
              // done slot 与 imgs 的 URL 一一对应；error slot 不入 imgs（重试成功后才进）
              return (
                <View style={styles.photosRow}>
                  {/* 批B 修复 P2-2：render 直接读 slots state（slot 变化必须触发重渲染——
                      读 slotsRef.current 会让新 slot 上传期间不可见、删除后幽灵残留）；
                      ref 镜像仅供 handleAddPhoto/handleRetrySlot 等 event 回调闭包取最新值 */}
                  {slots.map((slot) => {
                    const idx = imgs.indexOf(slot.remoteUrl ?? '');
                    if (slot.state === 'done' && idx < 0) return null; // 已被用户删除
                    return (
                      <PhotoUploadTile
                        key={slot.id}
                        state={slot.state === 'idle' ? 'uploading' : slot.state}
                        uri={slot.state === 'done' ? slot.remoteUrl : slot.localUri}
                        progress={slot.progress}
                        errorKind={slot.errorKind}
                        errorCode={slot.errorCode}
                        errorMessage={
                          slot.errorCode
                            ? t(`errors.${slot.errorCode}`, { defaultValue: slot.errorMessage })
                            : slot.errorMessage
                        }
                        retryLabel={t('common.retry', { defaultValue: 'Retry' })}
                        addA11yLabel={t('review.a11y.addPhoto')}
                        retryA11yLabel={t('common.retry', { defaultValue: 'Retry' })}
                        deleteA11yLabel={t('review.a11y.removePhoto', { count: idx + 1 })}
                        onRetry={() => void handleRetrySlot(slot.id, onChange, imgs)}
                        onDelete={() => {
                          setSlots((prev) => prev.filter((s) => s.id !== slot.id));
                          if (idx >= 0) onChange(imgs.filter((_, i) => i !== idx));
                        }}
                        testID={`review-photo-${slot.id}`}
                      />
                    );
                  })}
                  {imgs.length < 3 && (
                    <PhotoUploadTile
                      addLabel={`${imgs.length} / 3`}
                      addA11yLabel={t('review.a11y.addPhoto')}
                      onAdd={() => void handleAddPhoto(imgs, onChange)}
                      disabled={uploading}
                      testID="review-add-photo"
                    />
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
              <Switch value={value ?? false} onValueChange={onChange} testID="review-anonymous" />
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
  // V18：进度提示条（原型 info-c 蓝底 + info 字）
  reviewProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  reviewProgressText: {
    fontSize: 12,
    fontWeight: '600',
  },
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
  // 已评 badge（绿色底 + ✓ + 「已评」文字）
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reviewedBadgeText: {
    color: ON_PRIMARY,
    ...typography['label-caps'],
    fontSize: 9,
    fontWeight: '700',
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
