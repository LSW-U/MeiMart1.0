import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, textStyle, spacing, gradientPresets, shadowPresets } from '@/theme';
import { DecorativeCorner } from '@/components/cultural/DecorativeCorner';
import type { Banner, BannerTheme } from '@/types';
import type { BannerCarouselProps } from './BannerCarousel.types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BANNER_HEIGHT = 180;

const THEME_GRADIENT: Record<BannerTheme, keyof typeof gradientPresets> = {
  primary: 'primaryFade',
  emerald: 'emeraldFade',
  blue: 'blueFade',
};

const THEME_BG: Record<BannerTheme, string> = {
  primary: '#961813',
  emerald: '#065f46',
  blue: '#1d4ed8',
};

export function BannerCarousel({
  banners,
  onBannerPress,
  autoPlay = true,
  autoPlayInterval = 4000,
  showDots = true,
  testID,
}: BannerCarouselProps) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, banners.length]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
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

function BannerCard({ banner, onPress }: { banner: Banner; onPress?: () => void }) {
  const theme = banner.theme ?? 'primary';
  const gradientPreset = gradientPresets[THEME_GRADIENT[theme]];
  const bgColor = THEME_BG[theme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bgColor },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Banner: ${banner.title}`}
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
        <Text style={styles.title} numberOfLines={3}>
          {banner.title}
        </Text>
        {banner.ctaLabel && (
          <View style={[styles.ctaBtn, shadowPresets.lg]}>
            <Text style={styles.ctaText}>{banner.ctaLabel}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollView: { width: '100%' },
  scrollContent: { gap: 0 },
  card: {
    width: Dimensions.get('window').width - spacing.lg * 2,
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
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  ctaBtn: {
    backgroundColor: '#634700',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    ...textStyle('label-caps'),
    color: '#ffffff',
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
