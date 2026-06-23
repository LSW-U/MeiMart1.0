import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { TaisPatternProps } from './TaisPattern.types';

export function TaisPattern({
  width = 200,
  height = 200,
  opacity = 0.1,
  testID,
}: TaisPatternProps) {
  const { colors } = useTheme();
  const dotColor = colors.cultural.gold;
  return (
    <View testID={testID} style={[styles.container, { width, height, opacity }]}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="tais" patternUnits="userSpaceOnUse" width={24} height={24}>
            <Circle cx={12} cy={12} r={0.5} fill={dotColor} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#tais)" />
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
