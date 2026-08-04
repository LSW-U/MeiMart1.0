import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Pattern, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { TaisPatternProps } from './TaisPattern.types';

export function TaisPattern({ height = 200, opacity = 0.1, testID }: TaisPatternProps) {
  const { colors } = useTheme();
  // Why: 用屏幕宽撑满 header。原实现 container 只 left:0 + 固定 width prop（调用方传 400），
  // web/宽屏下 400 < 屏幕宽 → 右侧无纹样，看起来"只显示左半"。改用 useWindowDimensions 撑满。
  const { width: screenWidth } = useWindowDimensions();
  const goldColor = colors.cultural.gold;
  // Why: 方案 E — 45° 细线层 + 菱形棋盘层，替换原 r=0.5 圆点矩阵。
  // SVG 内 opacity 用「满强度」值（0.45 / 0.3），由外层 View 的 opacity prop 稀释：
  // 调用方传 0.2 时，最终 line≈0.09 / diamond≈0.06（Tais 纹样应有的淡纹理）。
  // 注：width prop 不再使用（保留入参兼容），统一按屏幕宽渲染避免宽屏裁切。
  return (
    <View testID={testID} style={[styles.container, { height, opacity }]}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          <Pattern id="taisLines" patternUnits="userSpaceOnUse" width={14} height={14}>
            <Line x1="0" y1="14" x2="14" y2="0" stroke={goldColor} strokeWidth={1} opacity={0.45} />
          </Pattern>
          <Pattern id="taisDiamonds" patternUnits="userSpaceOnUse" width={28} height={28}>
            <Path d="M14 4 L24 14 L14 24 L4 14 Z" fill={goldColor} opacity={0.3} />
          </Pattern>
        </Defs>
        <Rect width={screenWidth} height={height} fill="url(#taisLines)" />
        <Rect width={screenWidth} height={height} fill="url(#taisDiamonds)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
