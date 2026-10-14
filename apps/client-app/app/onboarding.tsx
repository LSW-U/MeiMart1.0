// OnboardingPage — 引导页（3 屏滑动 + DiamondPattern + LogoBadge，末屏锯齿分隔线收尾）
// 视觉统一批（20261014，Stitch「Modern Timorese Heritage」深红暖调）：三屏同构深红暖调卡型
// （4:3.8 渐变卡 + crimson 软影 + 光晕 + 屋顶线饰 + 白圆图标 + 右下深红徽章），
// 屏2绿调/屏3琥珀调废弃，差异仅 icon/徽章/tagline 内容；颜色全部走 colors.onboarding token。
// D8（引导页内容可配置 批3）：远端 slides 成功拉取优先，失败/空回退本地 SLIDES；
// 配图屏走 SafeImage，无图沿用 icon 卡型；4 处消费点统一读 slides 变量
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { BlurView } from 'expo-blur';
import Svg, { Path, Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage';
import { useAppStore } from '@/store/appStore';
import { useOnboardingSlides } from '@/services/queries/useOnboardingSlides';
import type { OnboardingSlideRemote } from '@/services/onboarding';
import { useLocalizer } from '@/i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** 插画卡型尺寸（规格 §一：320×304 4:3.8，窄屏按宽度自适应保持比例） */
const CARD_WIDTH = Math.min(320, SCREEN_WIDTH - spacing.xl * 2);
const CARD_HEIGHT = Math.round((CARD_WIDTH * 3.8) / 4);

interface Slide {
  id: string;
  /** Material Symbol 名（iconMapping 已映射） */
  icon: string;
  /** 本地屏为 i18n key（string）；远端屏为五语 JSON（LocalizableText 兼容，t/localize 按来源分派） */
  titleKey: string | Record<string, string>;
  bodyKey: string | Record<string, string>;
  /** 远端配图 URL；本地兜底屏恒 null 走 icon 卡型 */
  imageUrl?: string | null;
  /** 仅末屏 'tais'：无 pill、文案下锯齿分隔线 + 菱形徽章（规格 §二） */
  motif: 'cart' | 'verified' | 'tais';
}

/** 本地兜底 SLIDES；后端就绪后由 useOnboardingSlides() 切换（D8），兜底常量永不删除（方案 D5） */
const SLIDES: Slide[] = [
  {
    id: 's1',
    icon: 'shopping_basket',
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

/** 三屏差异映射（规格 §二）：badge 徽章 icon（屏3 为菱形 SVG，无 MC 图标）+ tagline pill */
const BADGE_ICON: Record<Slide['motif'], string> = {
  cart: 'nest_eco_leaf',
  verified: 'shield',
  tais: 'local_florist', // 占位：屏3 徽章走 TaisDiamondBadge SVG，不消费此表
};
const TAGLINE_I18N: Partial<Record<Slide['motif'], string>> = {
  cart: 'onboarding.tagline.market',
  verified: 'onboarding.tagline.cooperative',
};
/** tagline pill icon 按屏分派（P3-2，规格 §二：屏1 storefront、屏2 eco；屏3 无 pill 不消费） */
const TAGLINE_ICON: Partial<Record<Slide['motif'], string>> = {
  cart: 'storefront',
  verified: 'eco',
};

// Why: FlatList 的 viewabilityConfig 必须引用稳定，否则触发
// "Changing onViewableItemsChanged on the fly is not supported"
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

/** 远端五语 slide → 渲染模型（motif 按序位派生：末屏 tais 收尾，其余轮换 cart/verified） */
function fromRemote(remote: OnboardingSlideRemote, index: number, total: number): Slide {
  return {
    id: remote.id,
    icon: remote.icon ?? 'storefront',
    titleKey: remote.title,
    bodyKey: remote.description,
    imageUrl: remote.imageUrl,
    // 末屏（唯一）走 tais 文化收尾；其余按序位轮换
    motif: index === total - 1 ? 'tais' : index % 2 === 0 ? 'cart' : 'verified',
  };
}

/** Tais 菱形徽章（屏3 右下，规格 §二：Stitch 原稿 diamond SVG 24px 深红） */
function TaisDiamondBadge({ color, testID }: { color: string; testID?: string }) {
  return (
    <View testID={testID}>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
        <Path d="M12 2L2 12l10 10 10-10L12 2zm0 4.5l5.5 5.5-5.5 5.5-5.5-5.5L12 6.5z" />
        <Circle cx={12} cy={12} r={2} />
      </Svg>
    </View>
  );
}

/** 手织锯齿分隔线（屏3 专属，规格 §二：Stitch 原稿 zigzag path，深红 40%） */
function TaisZigzagDivider({ color }: { color: string }) {
  return (
    <View testID="onboarding-zigzag" style={styles.zigzagWrap}>
      <Svg width={160} height={12} viewBox="0 0 160 12" fill={color}>
        <Path d="M0,6 L10,0 L20,6 L30,0 L40,6 L50,0 L60,6 L70,0 L80,6 L90,0 L100,6 L110,0 L120,6 L130,0 L140,6 L150,0 L160,6 L150,12 L140,6 L130,12 L120,6 L110,12 L100,6 L90,12 L80,6 L70,12 L60,6 L50,12 L40,6 L30,12 L20,6 L10,12 Z" />
        <Circle cx={80} cy={6} r={3} />
      </Svg>
    </View>
  );
}

export default function OnboardingPage() {
  const { colors } = useTheme();
  const ob = colors.onboarding;
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const localize = useLocalizer();

  // D8 切换（方案v2 §二#3）：4 处消费点统一读合并后的 slides——
  // 失败/空表回退本地 SLIDES（useOnboardingSlides 已把失败/空归一为 null）
  const { data: remoteSlides } = useOnboardingSlides();
  const slides: Slide[] = remoteSlides
    ? remoteSlides.map((r, i) => fromRemote(r, i, remoteSlides.length))
    : SLIDES;
  // Why: 文案取值双来源——本地屏 titleKey 是 i18n key 走 t()；远端屏是五语 JSON 走 localize()（缺语言回退 en）
  const slideText = (s: Slide, key: 'titleKey' | 'bodyKey'): string => {
    const v = s[key];
    if (typeof v === 'string') return t(v);
    return localize(v);
  };

  // 视觉统一批 P3-1：shadowColor/blur 栏底色等颜色值全部走 ob.* token，
  // 经 inline style 注入（StyleSheet.create 静态上下文读不到 useTheme，故颜色拆出此处）
  // Why: useMemo 保引用稳定，避免每次渲染生成新样式对象导致无谓重渲染
  const tokenStyles = useMemo(
    () => ({
      // 卡 crimson 软影（规格 §一 = ob.badge #b83228）
      cardShadow: { shadowColor: ob.badge } as const,
      // 白圆底（surface-container-lowest/90）+ 其淡影（= ob.primary）
      iconCircle: {
        backgroundColor: 'rgba(255,255,255,0.9)', // = ob['icon-circle'] 90%（#ffffff）
        shadowColor: ob.primary,
      } as const,
      // 徽章影（= ob.primary #961813）
      badgeShadow: { shadowColor: ob.primary } as const,
      // 主按钮影（= ob.primary #961813）
      btnShadow: { shadowColor: ob.primary } as const,
      // 顶/底栏 blur 底色（#fff8f7 80% = ob.bar）
      bar: { backgroundColor: 'rgba(255,248,247,0.8)' } as const,
    }),
    [ob],
  );

  const isLast = index === slides.length - 1;

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
    <SafeAreaWrapper edges={['bottom']} style={[styles.container, { backgroundColor: ob.bg }]}>
      <StatusBarConfig />

      {/* DiamondPattern 极淡装饰背景（D4 保留，深红 4%） */}
      <View style={styles.diamondBg} pointerEvents="none">
        <DiamondPattern width={SCREEN_WIDTH} height={SCREEN_WIDTH} opacity={0.04} />
      </View>

      {/* Header — Skip 按钮 + Logo（暖象牙 blur 顶栏，规格 §三） */}
      <BlurView intensity={40} tint="light" style={[styles.headerBlur, tokenStyles.bar]}>
        <View style={[styles.header, { borderBottomColor: ob.outline }]}>
          <View style={styles.logoWrap}>
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
              <Text style={[styles.skipText, { color: ob['on-surface-variant'] }]}>
                {t('onboarding.skip')}
              </Text>
            </Pressable>
          )}
        </View>
      </BlurView>

      {/* 滑动主体 */}
      <FlatList
        ref={listRef}
        data={slides}
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
          const taglineKey = TAGLINE_I18N[item.motif];
          const taglineIcon = TAGLINE_ICON[item.motif];
          return (
            <View style={styles.slide}>
              {/* 统一插画卡（规格 §一：深红暖调卡型，三屏同构） */}
              <View style={styles.imageWrap}>
                <Pressable
                  style={({ pressed }) => [
                    styles.imageCard,
                    tokenStyles.cardShadow,
                    pressed && styles.imageCardPressed,
                  ]}
                >
                  {/* 卡底三段暖调渐变（对角线）+ crimson 软影 */}
                  <LinearGradient
                    colors={[ob['card-low'], ob['card-mid'], ob['card-high']]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  >
                    {/* 右上光晕（primary-fixed → tertiary-fixed，opacity 0.4） */}
                    <View style={styles.glowWrap} pointerEvents="none">
                      <LinearGradient
                        colors={[ob['glow-from'], ob['glow-to']]}
                        start={{ x: 0, y: 1 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.glow}
                      />
                    </View>

                    {/* 屋顶线饰（Uma Lulik motif：卡顶居中深红三角，opacity 0.2） */}
                    <View style={styles.rooflineWrap} pointerEvents="none">
                      <Svg width={64} height={12} viewBox="0 0 64 12">
                        <Path d="M32 0L44 12H20L32 0Z" fill={ob.primary} opacity={0.2} />
                      </Svg>
                    </View>

                    {/* 中心区：配图屏 SafeImage 铺满 + 图上层光晕/线饰叠层（P3-3，规格 §一
                        「光晕叠在图上层 opacity 0.25」）；无图屏白圆图标 */}
                    {item.imageUrl ? (
                      <>
                        <SafeImage
                          source={{ uri: item.imageUrl }}
                          style={styles.cardImage}
                          testID="onboarding-image"
                        />
                        {/* 图上层光晕：同 glow 几何，opacity 0.25（规格 §一配图屏段） */}
                        <View style={styles.glowWrap} pointerEvents="none">
                          <LinearGradient
                            colors={[ob['glow-from'], ob['glow-to']]}
                            start={{ x: 0, y: 1 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.glow, styles.glowOverImage]}
                          />
                        </View>
                        {/* 图上层屋顶线饰（同无图屏样式，恢复规格意图） */}
                        <View style={styles.rooflineWrap} pointerEvents="none">
                          <Svg width={64} height={12} viewBox="0 0 64 12">
                            <Path d="M32 0L44 12H20L32 0Z" fill={ob.primary} opacity={0.2} />
                          </Svg>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.iconCircle, tokenStyles.iconCircle]}>
                        <Icon symbol={item.icon} size={52} color={ob.primary} />
                      </View>
                    )}
                  </LinearGradient>

                  {/* 右下深红徽章（屏1/2 MC icon；屏3 菱形 SVG） */}
                  <View
                    style={[styles.badge, tokenStyles.badgeShadow, { backgroundColor: ob.badge }]}
                  >
                    {item.motif === 'tais' ? (
                      <TaisDiamondBadge color={ob['icon-circle']} testID="onboarding-badge-tais" />
                    ) : (
                      <Icon symbol={BADGE_ICON[item.motif]} size={24} color={ob['icon-circle']} />
                    )}
                  </View>
                </Pressable>
              </View>

              {/* tagline pill（屏1/2；屏3 无） */}
              {taglineKey && taglineIcon && (
                <View style={[styles.tagline, { backgroundColor: ob['card-high'] }]}>
                  <Icon symbol={taglineIcon} size={14} color={ob.primary} />
                  <Text style={[styles.taglineText, { color: ob.primary }]}>{t(taglineKey)}</Text>
                </View>
              )}

              {/* 文案 */}
              <Text style={[styles.title, { color: ob['on-surface'] }]} accessibilityRole="header">
                {slideText(item, 'titleKey')}
              </Text>
              <Text style={[styles.body, { color: ob['on-surface-variant'] }]}>
                {slideText(item, 'bodyKey')}
              </Text>

              {/* 手织锯齿分隔线：仅末屏收尾（规格 §二） */}
              {item.motif === 'tais' && <TaisZigzagDivider color={`${ob.primary}66`} />}
            </View>
          );
        }}
      />

      {/* Footer — Dots + 主按钮 + 次按钮（暖象牙 blur 底栏，规格 §三） */}
      <BlurView intensity={40} tint="light" style={[styles.footerBlur, tokenStyles.bar]}>
        <View style={[styles.footer, { borderTopColor: ob.outline }]}>
          {/* Dot 指示器（active 24×8 深红胶囊 / inactive 8×8） */}
          <View style={styles.dots}>
            {slides.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityRole="tab"
                accessibilityState={{ selected: i === index }}
                accessibilityLabel={t('onboarding.a11y.slide', { index: i + 1 })}
                testID={`dot-${s.id}`}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === index ? ob.primary : ob.outline,
                      width: i === index ? 24 : 8,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* 主按钮（56px 高深红填充，白字 label-caps，圆角 full） */}
          <Pressable
            onPress={next}
            style={({ pressed }) => [
              styles.primaryBtn,
              tokenStyles.btnShadow,
              { backgroundColor: ob.primary },
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? t('onboarding.start') : t('common.next')}
            testID="onboarding-next"
          >
            <Text style={[styles.primaryBtnText, { color: ob['icon-circle'] }]}>
              {isLast ? t('onboarding.start') : t('common.next')}
            </Text>
            <Icon symbol="arrow_forward" size={18} color={ob['icon-circle']} />
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
              <Text style={[styles.secondaryText, { color: ob['on-surface-variant'] }]}>
                {t('auth.login')}
              </Text>
            </Pressable>
          )}
        </View>
      </BlurView>
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
  headerBlur: {
    overflow: 'hidden',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    // 1px 分隔影（规格 §三：blur 栏 + 1px 分隔线；底色 = ob.bar 80% 经 tokenStyles.bar 注入）
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  imageWrap: {
    position: 'relative',
    marginBottom: spacing.xl,
  },
  imageCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 26,
    overflow: 'hidden',
    // crimson 软影几何（规格 §一：0 12px 32px -8px rgba(184,50,40,0.12)）；
    // shadowColor = ob.badge 经 tokenStyles.cardShadow inline 注入（P3-1）
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  imageCardPressed: {
    transform: [{ translateY: -2 }, { scale: 0.985 }],
  },
  cardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    position: 'absolute',
    top: -spacing.xl,
    right: -spacing.lg,
  },
  glow: {
    width: 144,
    height: 144,
    borderRadius: 72,
    opacity: 0.4,
  },
  // 配图屏图上层光晕（P3-3）：几何同 glow，opacity 降至 0.25（规格 §一配图屏段）
  glowOverImage: {
    opacity: 0.25,
  },
  rooflineWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor/shadowColor 经 tokenStyles.iconCircle inline 注入（P3-1）
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    bottom: -spacing.sm,
    right: -spacing.sm,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    // shadowColor = ob.primary 经 tokenStyles.badgeShadow inline 注入（P3-1）
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 6,
  },
  tagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  taglineText: {
    ...typography['label-caps'],
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h2,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    ...typography['body-md'],
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 300,
    lineHeight: 24,
  },
  zigzagWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  footerBlur: {
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: layout['container-margin'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    // 底色 = ob.bar 80% 经 tokenStyles.bar 注入（P3-1）
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.full,
    // shadowColor = ob.primary 经 tokenStyles.btnShadow inline 注入（P3-1）
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnText: {
    ...typography['label-caps'],
    fontWeight: '700',
    letterSpacing: 2,
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
