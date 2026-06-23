// ⚠️ 无 HTML 原型，参考 SplashPage 推导实现，待设计确认
// OnboardingPage — 引导页（参考 SplashPage.html 192 行的视觉风格）
// D.2: 3 屏滑动 + DiamondPattern + LogoBadge + TaisPattern + 文化装饰
import { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  type ViewToken,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { TaisDivider } from '@/components/cultural/TaisDivider';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/appStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Slide {
  id: string;
  image: string;
  titleKey: string;
  bodyKey: string;
  motif: 'cart' | 'verified' | 'tais' | 'lock';
}

const SLIDES: Slide[] = [
  {
    id: 's1',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600',
    titleKey: 'onboarding.title1',
    bodyKey: 'onboarding.desc1',
    motif: 'cart',
  },
  {
    id: 's2',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600',
    titleKey: 'onboarding.title2',
    bodyKey: 'onboarding.desc2',
    motif: 'verified',
  },
  {
    id: 's3',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8b58?w=600',
    titleKey: 'onboarding.title3',
    bodyKey: 'onboarding.desc3',
    motif: 'tais',
  },
];

const MOTIF_ICON: Record<Slide['motif'], string> = {
  cart: 'shopping_cart',
  verified: 'verified',
  tais: 'local_florist',
  lock: 'lock',
};

export default function OnboardingPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);

  const isLast = index === SLIDES.length - 1;

  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setIndex(viewableItems[0].index);
    }
  };

  const goTo = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
  };

  const next = () => {
    if (isLast) {
      setOnboardingCompleted(true);
      router.replace('/(auth)/login');
    } else {
      goTo(index + 1);
    }
  };

  const skip = () => {
    setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) setIndex(i);
  };

  return (
    <SafeAreaWrapper
      edges={['bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />

      {/* DiamondPattern 装饰背景（参考 SplashPage 第 150 行） */}
      <View style={styles.diamondBg} pointerEvents="none">
        <DiamondPattern width={SCREEN_WIDTH} height={SCREEN_WIDTH} opacity={0.04} />
      </View>

      {/* Header — Skip 按钮 + Logo */}
      <View style={styles.header}>
        <View style={[styles.logoWrap, shadowPresets.sm]}>
          <LogoBadge size={36} />
        </View>
        {!isLast && (
          <Pressable
            onPress={skip}
            hitSlop={8}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.skip')}
            testID="onboarding-skip"
          >
            <Text style={[styles.skipText, { color: colors['on-surface-variant'] }]}>
              {t('onboarding.skip')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* 滑动主体 */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        renderItem={({ item }: { item: Slide }) => (
          <View style={styles.slide}>
            {/* 文化纹样背景（参考 SplashPage 的 tais-pattern） */}
            <View style={styles.slidePattern} pointerEvents="none">
              <TaisPattern width={SCREEN_WIDTH} height={160} opacity={0.18} />
            </View>

            {/* motif 图标 + 图片 */}
            <View style={styles.imageWrap}>
              <View
                style={[styles.motifBadge, { backgroundColor: colors.primary }, shadowPresets.md]}
              >
                <Icon symbol={MOTIF_ICON[item.motif]} size={24} color="#ffffff" />
              </View>
              <View style={[styles.imageCard, shadowPresets.lg]}>
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
              </View>
            </View>

            {/* 文案 */}
            <Text
              style={[styles.title, { color: colors['on-surface'] }]}
              accessibilityRole="header"
            >
              {t(item.titleKey)}
            </Text>
            <Text style={[styles.body, { color: colors['on-surface-variant'] }]}>
              {t(item.bodyKey)}
            </Text>

            {/* Tais Divider */}
            <View style={styles.dividerWrap}>
              <TaisDivider width={100} />
            </View>
          </View>
        )}
      />

      {/* Footer — Dots + 主按钮 + 次按钮 */}
      <View style={[styles.footer, { backgroundColor: colors['surface-container-lowest'] }]}>
        {/* Dot 指示器 */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => goTo(i)}
              hitSlop={8}
              accessibilityRole="tab"
              accessibilityState={{ selected: i === index }}
              accessibilityLabel={`Slide ${i + 1}`}
              testID={`dot-${s.id}`}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? colors.primary : colors['outline-variant'],
                    width: i === index ? 24 : 8,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {/* 主按钮 */}
        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.start') : t('common.next')}
          testID="onboarding-next"
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? t('onboarding.start') : t('common.next')}
          </Text>
          <Icon symbol="arrow_forward" size={18} color="#ffffff" />
        </Pressable>

        {/* 最后屏额外的 Login / Register 入口 */}
        {isLast && (
          <Pressable
            onPress={skip}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Already have an account"
            testID="onboarding-login"
          >
            <Text style={[styles.secondaryText, { color: colors['on-surface-variant'] }]}>
              {t('auth.login')}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  diamondBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['container-margin'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    zIndex: 2,
  },
  logoWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skipText: {
    ...typography['label-caps'],
    fontWeight: '700',
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  slidePattern: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    right: 0,
  },
  imageWrap: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  motifBadge: {
    position: 'absolute',
    top: -spacing.sm,
    right: -spacing.sm,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  imageCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  image: {
    width: 240,
    height: 240,
  },
  title: {
    ...typography.h2,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    ...typography['body-md'],
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
    lineHeight: 22,
  },
  dividerWrap: {
    marginTop: spacing.md,
    opacity: 0.5,
  },
  footer: {
    paddingHorizontal: spacing['container-margin'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(141,112,108,0.2)',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  primaryBtnText: {
    color: '#ffffff',
    ...typography['label-caps'],
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    ...typography['body-sm'],
    fontWeight: '600',
  },
});
