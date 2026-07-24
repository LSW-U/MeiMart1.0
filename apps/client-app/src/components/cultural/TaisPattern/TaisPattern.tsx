import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { TaisPatternProps } from './TaisPattern.types';

export function TaisPattern({
  width = 200,
  height = 200,
  opacity = 0.1,
  testID,
}: TaisPatternProps) {
  const { colors } = useTheme();
  const goldColor = colors.cultural.gold;
  // Why: 方案 E — 45° 细线层 + 菱形棋盘层，替换原 r=0.5 圆点矩阵。
  // SVG 内 opacity 用「满强度」值（0.45 / 0.3），由外层 View 的 opacity prop 稀释：
  // 调用方传 0.2 时，最终 line≈0.09 / diamond≈0.06（Tais 纹样应有的淡纹理）。
  return (
    <View testID={testID} style={[styles.container, { width, height, opacity }]}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="taisLines" patternUnits="userSpaceOnUse" width={14} height={14}>
            <Line x1="0" y1="14" x2="14" y2="0" stroke={goldColor} strokeWidth={1} opacity={0.45} />
          </Pattern>
          <Pattern id="taisDiamonds" patternUnits="userSpaceOnUse" width={28} height={28}>
            <Path d="M14 4 L24 14 L14 24 L4 14 Z" fill={goldColor} opacity={0.3} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#taisLines)" />
        <Rect width={width} height={height} fill="url(#taisDiamonds)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
