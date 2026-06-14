import { Animated, Easing, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useTheme } from '@/theme';

import type { SkeletonProps } from './Skeleton.types';

export function Skeleton({
  width = '100%',
  height = 16,
  variant = 'rect',
  radius,
  testID,
}: SkeletonProps) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const borderRadius = variant === 'circle' ? 9999 : variant === 'text' ? 2 : (radius ?? 4);

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.base,
        {
          width: width as any,
          height: height as any,
          backgroundColor: colors['surface-container-high'],
          borderRadius,
          opacity,
        },
      ]}
      accessibilityRole="none"
      accessibilityLabel="Loading"
    />
  );
}

const styles = StyleSheet.create({
  base: {},
});
