/**
 * Logo — Mei Mart 完整品牌 Logo
 *
 * 还原自 HTML 原型（HomePage.html header line 131-138）：
 * - 菱形描边（顶点 20,5 → 36,32 → 4,32 → 4,5）
 * - 内层三角填充（半透明主色）
 * - 顶部金色圆点
 * - 底部水平底线
 * - 中段虚线
 *
 * 与 LogoBadge（仅菱形 + 单字母）的区别：
 *   LogoBadge 用于 App 内 Brand Mark（Splash / Onboarding）
 *   Logo 还原 HTML Header 的完整 SVG 装饰，配合 "Mei mart" 文字
 *
 * 用法：
 *   <Logo size={32} />
 *   <Logo size={32} withText /> // 含右侧 "Mei mart" 文字（默认 false）
 */
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { useTheme, typography } from '@/theme';

export type LogoProps = {
  size?: number;
  withText?: boolean;
  testID?: string;
};

export function Logo({ size = 32, withText = false, testID }: LogoProps) {
  const { colors } = useTheme();
  const stroke = colors['primary-fixed-dim'];
  const fill = colors['on-primary-fixed-variant'];
  const gold = colors.cultural.gold;

  return (
    <View testID={testID} style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect x={5} y={32} width={30} height={3} fill={fill} />
        <Path d="M20 5L36 32H4L20 5Z" fill="none" stroke={stroke} strokeWidth={1.5} />
        <Path d="M20 10L32 32H8L20 10Z" fill={fill} opacity={0.3} />
        <Circle cx={20} cy={5} r={2.5} fill={gold} />
        <Line
          opacity={0.4}
          stroke={stroke}
          strokeDasharray="2 2"
          strokeWidth={0.5}
          x1={8}
          y1={26}
          x2={32}
          y2={26}
        />
      </Svg>
      {withText && (
        <Text style={[styles.text, { color: colors['on-primary'] }]} accessibilityRole="header">
          Mei mart
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    ...typography.h2,
    fontWeight: '700',
  },
});
