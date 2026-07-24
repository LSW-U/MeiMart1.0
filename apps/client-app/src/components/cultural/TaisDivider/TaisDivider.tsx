import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { TaisDividerProps } from './TaisDivider.types';

const DIAMOND_PATH = 'M0 -5 L5 0 L0 5 L-5 0 Z';

export function TaisDivider({ width = 170, testID }: TaisDividerProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary;
  const goldColor = colors.cultural.gold;

  // Why: 方案 C — 菱形数量按 width 动态等间距（约每 20px 一颗），红描边空菱形与金实心菱形交替。
  const count = Math.max(5, Math.floor(width / 20));
  const step = width / (count + 1);
  const diamonds = Array.from({ length: count }, (_, i) => ({
    x: step * (i + 1),
    gold: i % 2 === 1,
  }));

  return (
    <View testID={testID} style={styles.container}>
      <Svg width={width} height={16} viewBox={`0 0 ${width} 16`}>
        <Defs>
          {/* 两端渐隐织线：透明 → 金 → 透明 */}
          <LinearGradient id="dividerFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={goldColor} stopOpacity="0" />
            <Stop offset="0.15" stopColor={goldColor} stopOpacity="0.6" />
            <Stop offset="0.85" stopColor={goldColor} stopOpacity="0.6" />
            <Stop offset="1" stopColor={goldColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <G transform="translate(0, 8)">
          {/* 织线：贯穿左右，两端渐隐 */}
          <Line x1="0" y1="0" x2={width} y2="0" stroke="url(#dividerFade)" strokeWidth={0.8} />
          {/* 红金菱形交替 */}
          {diamonds.map((d, i) => (
            <Path
              key={i}
              d={DIAMOND_PATH}
              transform={`translate(${d.x}, 0)`}
              fill={d.gold ? goldColor : 'none'}
              stroke={primaryColor}
              strokeWidth={1.2}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
