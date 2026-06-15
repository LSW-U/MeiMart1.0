// SplashPage — 还原自 SplashPage.html（193 行）
// HTML → RN 行数比：193 → ~145（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 75%）
// Fix-14: 补充标题 + 德顿语 Slogan + Hero 插画 + Loading 脉冲 + Progress Bar
import { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme, spacing, typography } from '@/theme';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDiv5iWgpp0XvikDOzbIN9KTwzoc1Ps3_K0Y5weXghZ-n1U7bdAvoEnt9OdAtZussEujHK4ETP_v-7XBEUubYsbgTF2up5GxB4-P4ERmm3WhPk3iCZOs_XVceypSa4kym7YiWasQ5NCE6U8JbKSBPkpu59H375qrfidXvZ-9dGQ1LR2JIteRxfgrWpKeRxD1tPdt7plKujqiSwyQV2OjuX0y7FnXj_atveqekuZxeYSCBB_IyhhzNa0i1lolYcxSAuC1xAvuuqU';

// 脉冲圆点（react-native-reanimated：opacity + scale 循环）
function LoadingDot({ color, delay }: { color: string; delay: number }) {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 560, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 560, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 560, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 560, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, scale]);

  return <Animated.View style={[styles.loadingDot, { backgroundColor: color }, animStyle]} />;
}

export default function SplashPage() {
  const { colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  // Progress Bar 进度（0 → 100% over 3000ms）
  const progress = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  useEffect(() => {
    progress.value = withTiming(1, { duration: 3000, easing: Easing.out(Easing.ease) });
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      if (!onboardingCompleted) {
        router.replace('/onboarding');
      } else if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(main)/home');
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [isAuthenticated, onboardingCompleted, progress]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      accessibilityLabel="Mei Mart Splash Screen"
      accessibilityRole="image"
    >
      <DiamondPattern />

      <View style={styles.topCol}>
        {/* Logo Badge 菱形（primary 红色 + M） */}
        <View
          style={[styles.logoBadge, { backgroundColor: colors.primary }]}
          accessibilityLabel="Mei Mart logo"
        >
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={[styles.title, { color: colors['on-surface'] }]}>Mei Mart</Text>
        <Text style={[styles.slogan, { color: colors.primary }]}>Tolu Hamutuk Sosa Fácil</Text>
        <Text style={[styles.subtitle, { color: colors['on-surface-variant'] }]}>
          Your Local Marketplace in Timor-Leste
        </Text>
      </View>

      <View style={styles.heroWrap}>
        <Image
          source={HERO_IMAGE}
          style={styles.heroImage}
          contentFit="contain"
          transition={300}
          recyclingKey="mei-mart-hero"
        />
      </View>

      <View style={styles.bottomCol}>
        <View style={styles.dotsRow}>
          <LoadingDot color={colors.secondary} delay={0} />
          <LoadingDot color={colors.primary} delay={200} />
          <LoadingDot color={colors.secondary} delay={400} />
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors['surface-container'] }]}>
          <Animated.View
            style={[styles.progressFill, { backgroundColor: colors.primary }, progressStyle]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    position: 'relative',
  },
  topCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    width: '100%',
    maxWidth: 384,
    gap: spacing.xs,
  },
  logoBadge: {
    width: 96,
    height: 96,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logoText: {
    color: '#ffffff',
    fontFamily: 'Noto Serif',
    fontSize: 32,
    fontWeight: '700',
    fontStyle: 'italic',
    transform: [{ rotate: '-45deg' }],
  },
  title: {
    ...typography.h1,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  slogan: {
    ...typography['label-caps'],
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography['body-sm'],
    textAlign: 'center',
    opacity: 0.8,
  },
  heroWrap: {
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
    marginBottom: spacing.xl,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: '50%',
  },
  bottomCol: {
    zIndex: 10,
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  progressTrack: {
    width: 128,
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
