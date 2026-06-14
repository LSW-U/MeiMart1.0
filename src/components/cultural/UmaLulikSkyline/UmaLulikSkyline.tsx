import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { UmaLulikSkylineProps } from './UmaLulikSkyline.types';

export function UmaLulikSkyline({ height = 30, testID }: UmaLulikSkylineProps) {
  const { colors } = useTheme();
  const bgColor = colors.cultural.warmWhite;
  const goldColor = colors.cultural.gold;
  const peaks = [25, 75, 125, 175, 225, 275, 325, 375];
  const skylinePath =
    'M0 30 V20 L25 5 L50 20 L75 5 L100 20 L125 5 L150 20 L175 5 L200 20 L225 5 L250 20 L275 5 L300 20 L325 5 L350 20 L375 5 L400 20 V30 Z';

  return (
    <View testID={testID} style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 400 30" preserveAspectRatio="none">
        <Path d={skylinePath} fill={bgColor} />
        {peaks.map((cx, i) => (
          <Circle key={i} cx={cx} cy={5} r={2} fill={goldColor} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
