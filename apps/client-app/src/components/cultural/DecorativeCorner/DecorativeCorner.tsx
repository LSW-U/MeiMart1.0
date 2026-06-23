/**
 * DecorativeCorner — 角花装饰
 *
 * 还原自 HTML 原型中促销 banner 的装饰元素（HomePage.html line 182-191）：
 * - 三层叠加的三角形描边
 * - 多个金色圆点
 * - 中间菱形实心装饰
 * - 虚线分割
 *
 * 用于：
 *   - Banner 卡片右上角/左下角的装饰
 *   - 卡片渐变背景上的纹理叠加
 *
 * 用法：
 *   <DecorativeCorner size={120} variant="primary" />
 *
 * variant 控制色调：
 *   - 'light'  → 白色描边 + 金点（用于深色 banner）
 *   - 'primary' → 主色描边 + 金点（用于浅色卡片）
 */
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme';

export type DecorativeCornerVariant = 'light' | 'primary';

export type DecorativeCornerProps = {
  size?: number;
  variant?: DecorativeCornerVariant;
  testID?: string;
};

export function DecorativeCorner({ size = 120, variant = 'light', testID }: DecorativeCornerProps) {
  const { colors } = useTheme();
  const stroke = variant === 'light' ? '#ffffff' : colors.primary;
  const gold = colors.cultural.gold;

  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Path d="M50 10L90 80H10L50 10Z" stroke={stroke} strokeWidth={1.5} />
        <Path d="M30 40L60 90H0L30 40Z" stroke={stroke} strokeWidth={1} opacity={0.6} />
        <Path d="M70 40L100 90H40L70 40Z" stroke={stroke} strokeWidth={1} opacity={0.6} />
        <Circle cx={50} cy={10} r={4} fill={gold} />
        <Circle cx={30} cy={40} r={3} fill={gold} />
        <Circle cx={70} cy={40} r={3} fill={gold} />
        <Path d="M50 45 L55 50 L50 55 L45 50 Z" fill={gold} />
        <Line
          stroke={stroke}
          strokeDasharray="4 4"
          strokeWidth={0.5}
          x1={10}
          y1={65}
          x2={90}
          y2={65}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
