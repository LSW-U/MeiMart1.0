import { View, StyleSheet } from 'react-native';
import Svg, { Defs, ClipPath, Polygon, Rect, Image } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { LogoBadgeProps } from './LogoBadge.types';

export function LogoBadge({ size = 80, testID }: LogoBadgeProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="diamondClip">
            <Polygon points="50,0 100,50 50,100 0,50" />
          </ClipPath>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={100}
          height={100}
          fill={colors.primary}
          clipPath="url(#diamondClip)"
        />
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
