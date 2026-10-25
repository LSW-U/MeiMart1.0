import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  // C-P3-12：AccessibilityInfo 与 RN 主包合并 import（import/no-duplicates）
  AccessibilityInfo,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { textStyle, spacing, useTheme } from '@/theme';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import type { Banner } from '@/types';
import type { BannerCarouselProps } from './BannerCarousel.types';

const BANNER_HEIGHT = 180;

export function BannerCarousel({
  banners,
  onBannerPress,
  autoPlay = true,
  autoPlayInterval = 4000,
  showDots = true,
  testID,
}: BannerCarouselProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // 原因：批1 A4 透传后 Banner.title 是 LocalizableText，渲染层 localize() 取值（P2-27 容器 label 用）
  const localize = useLocalizer();
  // C-P3-12（批4）：模块级 Dimensions.get 改 hook——旋转/分屏时宽度跟随，不再固化首帧
  const { width: screenWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // C-P3-12：autoplay 遵循系统 reduce-motion（无障碍偏好开启时不自动轮播）
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!autoPlay || reduceMotion || banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollToIndex(next);
        return next;
      });
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, reduceMotion, banners.length, screenWidth]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActiveIndex(idx);
  };

  // 审查批C判断题1：autoplay 与圆点跳页共用同一滚动（原两处 scrollTo 形状重复）
  const scrollToIndex = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * screenWidth, animated: true });
  };

  if (banners.length === 0) return null;

  return (
    // P2-27：容器补 a11y label（首张 banner 标题）——原 role="image" 无 label 读屏静默
    <View testID={testID} accessibilityRole="image" accessibilityLabel={localize(banners[0].title)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((banner) => (
          <BannerCard
            key={banner.id}
            banner={banner}
            screenWidth={screenWidth}
            onPress={onBannerPress ? () => onBannerPress(banner) : undefined}
          />
        ))}
      </ScrollView>
      {showDots && banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            // P2-27：圆点从纯装饰 View 改可点 Pressable（跳页 + 「第 n 张共 m 张」a11y + selected 态）
            <Pressable
              key={b.id}
              testID={`dot-${i}`}
              onPress={() => {
                setActiveIndex(i);
                scrollToIndex(i);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('home.a11y.bannerDot', {
                index: i + 1,
                total: banners.length,
              })}
              accessibilityState={{ selected: i === activeIndex }}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                {
                  backgroundColor: i === activeIndex ? colors.primary : colors['outline-variant'],
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function BannerCard({
  banner,
  screenWidth,
  onPress,
}: {
  banner: Banner;
  screenWidth: number;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // 原因：批1 A4 透传后 Banner.title 是 LocalizableText，渲染层 localize() 取值
  const localize = useLocalizer();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: screenWidth - spacing.lg * 2,
          borderColor: colors['outline-variant'],
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('home.a11y.banner', { title: localize(banner.title) })}
    >
      {/* 背景图（20261023 定稿：纯图片轮播，无底色无 scrim） */}
      {banner.image ? (
        <SafeImage
          source={{ uri: banner.image }}
          style={styles.bgImage}
          resizeMode="cover"
          variant="thumb"
          lazy
          recyclingKey={banner.id}
          accessible={false}
        />
      ) : null}

      {/* 文案（无色底，白字直接叠图——20261023 验收定稿删阴影） */}
      <View style={styles.content}>
        {/* 原因：图上白字固定白不随主题（dark 同值，同 E6/results ON_PRIMARY 模式）；20261023 删阴影后无 scrim，白字直接叠图 */}
        <Text style={[styles.title, { color: '#ffffff' }]} numberOfLines={3}>
          {localize(banner.title)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // BannerCarousel 内部用 spacing.lg (24px) 做 card 左右 margin，调用方不应再加
  // paddingHorizontal，否则 card 宽度（按屏宽计算）会超出可视区被裁。
  // C-P3-12：card 宽度不再静态取 Dimensions，改由 render 期按 screenWidth 注入（跟随旋转/分屏）
  scrollView: { width: '100%' },
  scrollContent: { gap: 0 },
  card: {
    marginHorizontal: spacing.lg,
    height: BANNER_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    // 20261023 定稿：纯图片卡加描边（SmallProductCard 同款 outline-variant 1px），
    // 图片浅色调时与页面背景的边界仍清晰
    borderWidth: 1,
  },
  pressed: { opacity: 0.92 },
  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    // 20261023 定稿：纯图片轮播，图全不透明铺满（resizeMode cover 裁切填满 342×180）
  },
  content: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 240,
  },
  title: {
    ...textStyle('h2'),
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16, height: 6, borderRadius: 3 },
});
