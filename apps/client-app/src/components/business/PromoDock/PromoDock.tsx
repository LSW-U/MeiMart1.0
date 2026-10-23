import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, promotionThemes, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { Promotion } from '@/services/promotion';
import type { PromotionTheme } from '@/theme';
import type { PromoDockProps } from './PromoDock.types';

// Why: 方案五（一+二结合，2026-10-23 人工验收拍板）— Lazada 式彩色裸放大图标（无底盒无色条）
//      + MercadoLibre 信息卡壳（标题+利益描述+主题色 CTA），横向 ScrollView snap 滑动。
//      视觉原型：Work-Wiki/.../首页促销停靠栏/促销停靠栏UI方案对比-20261023.html 方案五。
//      描述/CTA 文案走前端静态 i18n（路线 A→B 拍板：按 theme 查表，契约零改动）。

// Why: 人工验收定稿 — 卡宽由可视区动态二等分（减去 PAD_X×2 + gap），
//      不滑动时前 2 卡恰好完整露出（第 3 张起才需横滑）。此值为 onLayout 前的兜底。
const CARD_WIDTH = 172;
const CARD_GAP = 10;
// Why: scrollContent 左右 padding（与 track marginHorizontal 同值对齐）
const PAD_X = 12;
const CARD_RADIUS = 16;
const ICON_SIZE = 38;
// Why: 进度条 4px 高（HTML 稿 .scroll-track），滑块宽 = 可视区/内容总宽比例
const TRACK_HEIGHT = 4;
const THUMB_HEIGHT = 4;
const TRACK_RADIUS = 2;
// Why: 人工验收定稿 — 进度条仅滑动过程中显示，停止滚动 800ms 后隐藏
const HIDE_DELAY_MS = 800;

// Why: 方案五新增 i18n key 按 theme 查表（promotion.*Desc / promotion.*Cta，4 语对齐）
const THEME_TEXT_KEYS: Record<PromotionTheme, { descKey: string; ctaKey: string }> = {
  deals: { descKey: 'promotion.flashDealsDesc', ctaKey: 'promotion.flashDealsCta' },
  coupons: { descKey: 'promotion.couponsDesc', ctaKey: 'promotion.couponsCta' },
  delivery: { descKey: 'promotion.freeShipDesc', ctaKey: 'promotion.freeShipCta' },
  points: { descKey: 'promotion.pointsDesc', ctaKey: 'promotion.pointsCta' },
};

export function PromoDock({ promotions, onPress, testID }: PromoDockProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [thumbProgress, setThumbProgress] = useState(0);
  const [trackVisible, setTrackVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Why: §2.7 空态 - 无活动时不隐藏区块，显示虚线框占位（保持首页结构稳定）
  if (promotions.length === 0) {
    return (
      <View
        testID={testID}
        style={[styles.empty, { borderColor: colors['outline-variant'] }]}
        accessibilityRole="text"
        accessibilityLabel={t('promotion.empty')}
      >
        <Icon symbol="campaign" size={24} color={colors.outline} />
        <Text style={[styles.emptyText, { color: colors['on-surface-variant'] }]}>
          {t('promotion.empty')}
        </Text>
      </View>
    );
  }

  // Why: onScroll 每帧算进度（scrollEventThrottle 16）；滚动中显示进度条，停止 800ms 后隐藏
  const handleScroll = (e: {
    nativeEvent: {
      contentOffset: { x: number };
      contentSize: { width: number };
      layoutMeasurement: { width: number };
    };
  }) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxScroll = contentSize.width - layoutMeasurement.width;
    if (maxScroll > 0) {
      setThumbProgress(contentOffset.x / maxScroll);
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setTrackVisible(true);
    hideTimer.current = setTimeout(() => setTrackVisible(false), HIDE_DELAY_MS);
  };

  // Why: 动态卡宽就绪后由可视区推导（与卡宽公式同源，snap 落点不漂移）；
  //   onLayout 前兜底退回固定值。Q3 修正：方案迭代后卡宽 172/动态 178，注释残留 218 已清。
  const dynamicCardWidth =
    viewportWidth > 0 ? Math.floor((viewportWidth - 2 * PAD_X - CARD_GAP) / 2) : CARD_WIDTH;
  const snapInterval = dynamicCardWidth + CARD_GAP;
  const contentWidth = promotions.length * dynamicCardWidth + (promotions.length - 1) * CARD_GAP;
  const ratio = contentWidth > 0 ? Math.min(1, viewportWidth / contentWidth) : 1;

  return (
    <View testID={testID}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapInterval}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          // Why: 可视区宽度就绪后算滑块宽占比（可视区/内容总宽）
          setViewportWidth(e.nativeEvent.layout.width);
        }}
        contentContainerStyle={styles.scrollContent}
      >
        {promotions.map((item) => (
          <PromoCard key={item.id} promotion={item} onPress={onPress} width={dynamicCardWidth} />
        ))}
      </ScrollView>
      {/* 进度条（选项 B 自绘 + 人工验收定稿：仅滑动中显示，停止 800ms 后隐藏）：灰轨道 + 主题红滑块 */}
      <View
        style={[
          styles.track,
          { backgroundColor: colors['outline-variant'], opacity: trackVisible ? 1 : 0 },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(e) => {
          // Why: Q2 修复——thumb translateX 改数值像素（progress × 可滑区宽），
          //   百分比 translateX 类型无法表达曾用 as never 强转（规则 36 逃生舱），此写法绕开
          setTrackWidth(e.nativeEvent.layout.width);
        }}
      >
        <View
          style={[
            styles.thumb,
            {
              width: `${Math.max(20, ratio * 100)}%` as `${number}%`,
              backgroundColor: colors.primary,
              // 可滑区 = 轨道宽 − 滑块宽；滑块宽 = ratio × 轨道宽
              transform: [{ translateX: thumbProgress * Math.max(0, trackWidth * (1 - ratio)) }],
            },
          ]}
        />
      </View>
    </View>
  );
}

function PromoCard({
  promotion,
  onPress,
  width,
}: {
  promotion: Promotion;
  onPress?: (p: Promotion) => void;
  width: number;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = promotionThemes[promotion.theme];
  const textKeys = THEME_TEXT_KEYS[promotion.theme];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: colors['surface-container-lowest'],
          borderColor: colors['outline-variant'],
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(promotion) : undefined}
      accessibilityRole="button"
      accessibilityLabel={t(promotion.titleKey)}
    >
      {/* Lazada 式彩色裸放大图标：无底盒无色条，直接染主题深色 */}
      <Icon symbol={promotion.icon} size={ICON_SIZE} color={theme.iconColor} />
      <View style={styles.txt}>
        <Text style={[styles.title, { color: colors['on-surface'] }]} numberOfLines={1}>
          {t(promotion.titleKey)}
        </Text>
        <Text style={[styles.desc, { color: colors['on-surface-variant'] }]} numberOfLines={1}>
          {t(textKeys.descKey)}
        </Text>
        <Text style={[styles.cta, { color: theme.iconColor }]} numberOfLines={1}>
          {t(textKeys.ctaKey)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Why: 横滑内容容器 — 左右小 padding（PAD_X）收窄首卡左缘留白，卡间 gap 10
  scrollContent: {
    paddingHorizontal: PAD_X,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    ...shadowPresets.sm,
  },
  // Why: 方案五按压 scale(0.95) 沿用现状触觉反馈
  pressed: { transform: [{ scale: 0.95 }] },
  txt: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  desc: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  cta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  // Why: 进度条轨道 — 卡区下方 10px，4px 高圆角；左右对齐 scrollContent 的 PAD_X
  track: {
    marginTop: 10,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    marginHorizontal: PAD_X,
    overflow: 'hidden',
  },
  thumb: {
    height: THUMB_HEIGHT,
    borderRadius: TRACK_RADIUS,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: CARD_RADIUS,
  },
  emptyText: {
    fontSize: 12,
  },
});
