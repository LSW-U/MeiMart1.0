// OnboardingPage — 引导页（3 屏滑动 + DiamondPattern + LogoBadge，末屏 TaisPattern/TaisDivider 收尾）
// 插画区：图标 + 强调色渐变底（P24 方案 D2，替换原 Unsplash 外链图，断网不白屏）
import { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  type ViewToken,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius, shadowPresets } from '@/theme';
import type { AppColors } from '@/theme/colors';
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
  /** Material Symbol 名（iconMapping 已映射） */
  icon: string;
  titleKey: string;
  bodyKey: string;
  /** 仅末屏 'tais' 铺文化纹样 + Divider 收尾，屏1/2 保持干净（D4） */
  motif: 'cart' | 'verified' | 'tais';
}

// 本地兜底 SLIDES；后端 GET /client/onboarding/slides 就绪后由 useOnboardingSlides() 切换（D8）
const SLIDES: Slide[] = [
  {
    id: 's1',
    icon: 'shopping_cart',
    titleKey: 'onboarding.title1',
    bodyKey: 'onboarding.desc1',
    motif: 'cart',
  },
  {
    id: 's2',
    icon: 'verified',
    titleKey: 'onboarding.title2',
    bodyKey: 'onboarding.desc2',
    motif: 'verified',
  },
  {
    id: 's3',
    icon: 'local_florist',
    titleKey: 'onboarding.title3',
    bodyKey: 'onboarding.desc3',
    motif: 'tais',
  },
];

// Why: FlatList 的 viewabilityConfig 必须引用稳定，否则触发
// "Changing onViewableItemsChanged on the fly is not supported"
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/** 本地阶段强调色走 token（dark 自动翻转）；D8 后端下发 hex 后再切 inline + 校验 */
function motifAccent(colors: AppColors, motif: Slide['motif']): string {
  // 屏3 原型 #b45309(amber-700) 项目无 token，统一 warning（方案 Q3 拍板 A）
  if (motif === 'verified') return colors.semantic.positive;
  if (motif === 'tais') return colors.semantic.warning;
  return colors.primary;
}

export default function OnboardingPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);

  const isLast = index === SLIDES.length - 1;

  // Why: onViewableItemsChanged 必须引用稳定（useCallback），否则 FlatList 报错
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setIndex(viewableItems[0].index);
      }
    },
    [],
  );

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

  // D7：末屏「已有账号？登录」独立函数——行为同 skip 但语义独立，不复用跳过引导的命名
  const goLogin = () => {
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

      {/* DiamondPattern 极淡装饰背景（D4 保留） */}
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
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
        renderItem={({ item }: { item: Slide }) => {
          const accent = motifAccent(colors, item.motif);
          return (
          <View style={styles.slide}>
            {/* Tais 文化纹样：仅末屏铺（D4，屏1/2 删） */}
            {item.motif === 'tais' && (
              <View style={styles.slidePattern} pointerEvents="none">
                <TaisPattern width={SCREEN_WIDTH} height={160} opacity={0.18} />
              </View>
            )}

            {/* 插画区：图标 + 强调色渐变底 + motif 角标（D2，替外链图） */}
            <View style={styles.imageWrap}>
              <View style={[styles.imageCard, shadowPresets.lg]}>
                <LinearGradient
                  colors={[`${accent}33`, `${accent}11`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.illustration}
                >
                  {/* opacity 0.85 对齐原型 .ob-ill-inner span（图标略透明融入渐变底） */}
                  <Icon symbol={item.icon} size={96} color={accent} style={{ opacity: 0.85 }} />
                </LinearGradient>
              </View>
              <View
                style={[
                  styles.motifBadge,
                  { backgroundColor: accent, borderColor: colors['on-primary'] },
                  shadowPresets.md,
                ]}
              >
                <Icon symbol={item.icon} size={24} color={colors['on-primary']} />
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

            {/* Tais Divider：仅末屏收尾（D4） */}
            {item.motif === 'tais' && (
              <View style={styles.dividerWrap}>
                <TaisDivider width={100} />
              </View>
            )}
          </View>
          );
        }}
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
          <Text style={[styles.primaryBtnText, { color: colors['on-primary'] }]}>
            {isLast ? t('onboarding.start') : t('common.next')}
          </Text>
          <Icon symbol="arrow_forward" size={18} color={colors['on-primary']} />
        </Pressable>

        {/* 最后屏额外的 Login / Register 入口 */}
        {isLast && (
          <Pressable
            onPress={goLogin}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel={t('auth.alreadyHaveAccount')}
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
    paddingHorizontal: layout['container-margin'],
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
    // 对齐原型 .ob-ill-badge（右下角悬浮），非旧版右上角（P24 方案 §9.3）
    position: 'absolute',
    bottom: -spacing.sm,
    right: -spacing.sm,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 3,
  },
  imageCard: {
    // 原型 .ob-ill 为 26px，borderRadius token 无此档（2xl=16/full），计划内接受硬编码（SYS-nonstd-radius）
    borderRadius: 26,
    overflow: 'hidden',
  },
  illustration: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
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
