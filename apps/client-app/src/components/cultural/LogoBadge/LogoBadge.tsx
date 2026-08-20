import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, ClipPath, Polygon, Rect } from 'react-native-svg';
import { useTheme } from '@/theme';
import type { LogoBadgeProps } from './LogoBadge.types';

export function LogoBadge({ size = 80, testID }: LogoBadgeProps) {
  const { colors } = useTheme();
  // 对齐 SplashPage.html:152-154：菱形底 + 白色衬线斜体「M」
  // （原实现只有菱形色块无字母，dev 反馈与 HTML 不一致）
  const letterSize = Math.round(size * 0.42);
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
      <Text
        style={[styles.letter, { color: colors['on-primary'], fontSize: letterSize }]}
        accessibilityLabel="MeiMart"
      >
        M
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // SplashPage.html：text-white font-serif italic —— 菱形内白色衬线斜体 M
  letter: {
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontWeight: '600',
  },
});
