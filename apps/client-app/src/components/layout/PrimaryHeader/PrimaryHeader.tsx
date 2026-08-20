import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, typography, spacing, layout, shadowPresets } from '@/theme';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import type { PrimaryHeaderProps } from './PrimaryHeader.types';

export function PrimaryHeader({
  title,
  showBack = false,
  onBackPress,
  rightActions,
  showLocation = false,
  locationLabel,
  onLocationPress,
  centerTitle = false,
  testID,
}: PrimaryHeaderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View
      testID={testID}
      style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.lg]}
      accessibilityRole="header"
    >
      {/* tais-pattern 纹样背景（HTML 的 opacity-20） */}
      <View style={styles.bgPattern} pointerEvents="none">
        <TaisPattern width={400} height={120} opacity={0.2} />
      </View>

      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBackPress}
            hitSlop={8}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel={t('common.goBack')}
          >
            <Icon symbol="arrow_back" size={24} color={colors['on-primary']} />
          </Pressable>
        ) : (
          <View style={styles.btnPlaceholder} />
        )}

        <View style={centerTitle ? styles.titleWrapCentered : styles.titleWrap}>
          <Text style={[styles.title, { color: colors['on-primary'] }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>

        {/* Why: 位置胶囊浮在 header 右侧（title 和 rightActions 之间），半透明白底圆角 */}
        {showLocation && locationLabel && (
          <Pressable
            onPress={onLocationPress}
            style={styles.locationChip}
            accessibilityRole="button"
            accessibilityLabel={`Location: ${locationLabel}`}
          >
            <Icon symbol="location_on" size={13} color={colors['on-primary']} />
            <Text style={[styles.locationText, { color: colors['on-primary'] }]} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Icon symbol="expand_more" size={13} color={colors['on-primary']} />
          </Pressable>
        )}

        {rightActions ? (
          <View style={styles.rightActions}>{rightActions}</View>
        ) : (
          <View style={styles.btnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: layout['container-margin'],
    height: 56,
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: '100%',
  },
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlaceholder: {
    width: 0,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // centerTitle：绝对定位铺满整行居中——不受 back 按钮占位影响（标题对屏幕居中）
  // Why: RN types 只有 absoluteFill 无 absoluteFillObject（P27 同坑），展开 position 四向
  titleWrapCentered: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Why: 左右 padding 让长标题不被 back/右侧按钮压住
    paddingHorizontal: 88,
  },
  title: {
    ...typography.h3,
    fontWeight: '700',
  },
  // Why: 位置胶囊 - 半透明白底圆角，浮在 header 右侧
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 150,
  },
  locationText: {
    ...typography['body-sm'],
    fontSize: 12,
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
