import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Polygon, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { DiamondPatternProps } from './DiamondPattern.types';

export function DiamondPattern({
  width = 200,
  height = 200,
  opacity = 0.03,
  testID,
}: DiamondPatternProps) {
  const { colors } = useTheme();
  const fillColor = colors.primary;
  return (
    <View testID={testID} style={[styles.container, { width, height, opacity }]}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id="diamonds" patternUnits="userSpaceOnUse" width={40} height={40}>
            <Polygon points="0,20 20,0 40,20 20,40" fill={fillColor} fillOpacity={0.25} />
          </Pattern>
        </Defs>
        <Rect width={width} height={height} fill="url(#diamonds)" />
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
