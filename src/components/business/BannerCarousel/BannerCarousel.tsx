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
import { useTheme, textStyle, borderRadius } from '@/theme';
import type { BannerCarouselProps } from './BannerCarousel.types';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
      >
        {banners.map((banner) => (
          <Pressable
            key={banner.id}
            onPress={onBannerPress ? () => onBannerPress(banner) : undefined}
            style={styles.slide}
            accessibilityRole="button"
            accessibilityLabel={`Banner: ${banner.title}`}
          >
            <Image
              source={{ uri: banner.image }}
              style={[styles.image, { borderRadius: borderRadius.xl }]}
              accessible={false}
            />
            <View style={styles.overlay}>
              <Text
                style={[textStyle('h3'), { color: colors['on-primary'], fontWeight: '700' }]}
                numberOfLines={2}
              >
                {banner.title}
              </Text>
            </View>
          </Pressable>
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

const styles = StyleSheet.create({
  scrollView: { width: '100%' },
  slide: { width: SCREEN_WIDTH, paddingHorizontal: 16, position: 'relative' },
  image: { width: '100%', height: 160 },
  overlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
