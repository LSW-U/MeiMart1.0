import { View, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { TaisDividerProps } from './TaisDivider.types';

const DIAMOND_PATH = 'M0 -5 L5 0 L0 5 L-5 0 Z';

export function TaisDivider({ width = 170, testID }: TaisDividerProps) {
  const { colors } = useTheme();
  const primaryColor = colors.primary;
  const goldColor = colors.cultural.gold;
  const positions = [10, 30, 50, 70, 90, 110, 130, 150];
  const goldIndices = [2, 5]; // positions 50 and 110

  return (
    <View testID={testID} style={styles.container}>
      <Svg width={width} height={16} viewBox={`0 0 ${width} 16`}>
        <G transform="translate(0, 8)">
          {positions.map((x, i) => (
            <Path
              key={i}
              d={DIAMOND_PATH}
              transform={`translate(${x}, 0)`}
              fill={goldIndices.includes(i) ? goldColor : 'none'}
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
