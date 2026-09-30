import { useEffect, useRef, useState } from 'react';
import {
  Image,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing, gradientPresets, shadowPresets } from '@/theme';
import { DecorativeCorner } from '@/components/cultural/DecorativeCorner';
import type { Banner, BannerTheme } from '@/types';
import type { AppColors } from '@/theme/colors';
import type { BannerCarouselProps } from './BannerCarousel.types';

const BANNER_HEIGHT = 180;

const THEME_GRADIENT: Record<BannerTheme, keyof typeof gradientPresets> = {
  primary: 'primaryFade',
  emerald: 'emeraldFade',
  blue: 'blueFade',
};

// Why: banner 底色从 theme 派生（dark mode 自动适配）。emerald→success、blue→info。
// 注：emerald 由旧 #065f46 改为 semantic.success #059669（亮绿），肉眼可辨色变；
// 配套 gradientPresets.emeraldFade 已同步改为 #059669 系（见 gradients.ts）。
function getBannerBg(theme: BannerTheme, colors: AppColors): string {
  switch (theme) {
    case 'primary':
      return colors.primary;
    case 'emerald':
      return colors.semantic.success;
    case 'blue':
      return colors.semantic.info;
  }
}

export function BannerCarousel({
  banners,
  onBannerPress,
  autoPlay = true,
  autoPlayInterval = 4000,
  showDots = true,
  testID,
}: BannerCarouselProps) {
  const { colors } = useTheme();
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
        scrollRef.current?.scrollTo({ x: next * screenWidth, animated: true });
        return next;
      });
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, reduceMotion, banners.length, screenWidth]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setActiveIndex(idx);
  };

  if (banners.length === 0) return null;

  return (
    <View testID={testID} accessibilityRole="image">
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
            <View
              key={b.id}
              testID={`dot-${i}`}
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
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = banner.theme ?? 'primary';
  const gradientPreset = gradientPresets[THEME_GRADIENT[theme]];
  const bgColor = getBannerBg(theme, colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor, width: screenWidth - spacing.lg * 2 },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('home.a11y.banner', { title: banner.title })}
    >
      {/* 装饰角花（右上） */}
      <View style={styles.corner} pointerEvents="none">
        <DecorativeCorner size={120} variant="light" />
      </View>

      {/* 背景图（半透明叠加，呼应 HTML 的 opacity-40 mix-blend-overlay） */}
      {banner.image ? (
        <Image source={{ uri: banner.image }} style={styles.bgImage} accessible={false} />
      ) : null}

      {/* 渐变遮罩（左→右深→浅） */}
      <LinearGradient {...gradientPreset} style={styles.gradient} />

      {/* 文案 + CTA */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors['on-primary'] }]} numberOfLines={3}>
          {banner.title}
        </Text>
        {banner.ctaLabel && (
          <View style={[styles.ctaBtn, { backgroundColor: colors.tertiary }, shadowPresets.lg]}>
            <Text style={[styles.ctaText, { color: colors['on-primary'] }]}>{banner.ctaLabel}</Text>
          </View>
        )}
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
  },
  pressed: { opacity: 0.92 },
  corner: {
    position: 'absolute',
    right: -16,
    top: -8,
    opacity: 0.3,
  },
  bgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  gradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
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
    marginBottom: spacing.sm,
  },
  ctaBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    ...textStyle('label-caps'),
    fontSize: 11,
    letterSpacing: 0.05,
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
