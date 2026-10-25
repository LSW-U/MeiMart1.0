import { Pressable, StyleSheet } from 'react-native';

import { useTheme, zIndex } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';

import type { CartIconButtonProps } from './CartIconButton.types';

// P1-21（含审查批A判断题2）：TopBar / search / results 三处同形「购物车 + error 红角标」收敛。
// onPress 与 a11y 由调用方给（组件保持纯展示，不绑路由）；角标统一 Badge error 底 + maxCount 99。
export function CartIconButton({
  count,
  iconColor,
  onPress,
  accessibilityLabel,
  style,
  badgeStyle,
  hitSlop,
  testID,
}: CartIconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={hitSlop}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon symbol="shopping_cart" size={24} color={iconColor} />
      {count > 0 && (
        <Badge
          count={count}
          variant="number"
          color={colors.semantic.error}
          hideFromA11y
          style={[styles.badge, badgeStyle]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    // 审查批B判断题3：新代码消费 zIndex token（同批 P1-20 刚立的阶梯）
    zIndex: zIndex.raised,
  },
});
