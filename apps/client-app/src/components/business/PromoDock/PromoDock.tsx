import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, promotionThemes, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { Promotion } from '@/services/promotion';
import type { PromoDockProps } from './PromoDock.types';

// Why: 模块方案 §2.2 - 卡片圆角 14 / 图标盒圆角 12 / 色条 5px，介于 borderRadius xl(12)/2xl(16) 之间
const CARD_RADIUS = 14;
const ICON_BOX_RADIUS = 12;
const BAR_HEIGHT = 5;

export function PromoDock({ promotions, onPress, testID }: PromoDockProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

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

  return (
    <View style={styles.dock} testID={testID}>
      {promotions.map((item) => (
        <PromoCard key={item.id} promotion={item} onPress={onPress} />
      ))}
    </View>
  );
}

function PromoCard({
  promotion,
  onPress,
}: {
  promotion: Promotion;
  onPress?: (p: Promotion) => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const theme = promotionThemes[promotion.theme];
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-lowest'] },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(promotion) : undefined}
      accessibilityRole="button"
      accessibilityLabel={t(promotion.titleKey)}
    >
      <View style={styles.iconWrap}>
        <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
          <Icon symbol={promotion.icon} size={24} color={theme.iconColor} />
        </View>
        {/* Why: 方案二 - 图标盒底部 5px 色条替代文字标签（DEALS/SAVE），视觉更紧凑 */}
        <View style={[styles.bar, { backgroundColor: theme.barColor }]} />
      </View>
      <Text style={[styles.label, { color: colors['on-surface'] }]} numberOfLines={1}>
        {t(promotion.titleKey)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Why: §6.3 - 横排 flex row，4 卡 flex:1 等宽，卡间 gap 8。paddingHorizontal 由外层 section 提供
  dock: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: CARD_RADIUS,
    ...shadowPresets.sm,
  },
  // Why: §2.2 按压 scale(0.95) 触觉反馈
  pressed: { transform: [{ scale: 0.95 }] },
  // Why: iconWrap 包裹 iconBox + bar，relative 定位让 bar absolute bottom
  iconWrap: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: ICON_BOX_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Why: 色条 absolute bottom 0，底部圆角跟 iconBox 对齐
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    borderBottomLeftRadius: ICON_BOX_RADIUS,
    borderBottomRightRadius: ICON_BOX_RADIUS,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
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
