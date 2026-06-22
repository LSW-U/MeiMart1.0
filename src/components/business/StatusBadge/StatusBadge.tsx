import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClipPath, Defs, Polygon, Rect, Svg } from 'react-native-svg';

import { typography } from '@/theme';

import type { StatusBadgeProps } from './StatusBadge.types';

export function StatusBadge({ text, backgroundColor, testID }: StatusBadgeProps) {
  const w = 92;
  const h = 22;
  const offset = 8;
  return (
    <View
      testID={testID}
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
    >
      <Svg width={w} height={h}>
        <Defs>
          <ClipPath id="statusBadgeClip">
            <Polygon points={`${offset},0 ${w},0 ${w - offset},${h} 0,${h}`} />
          </ClipPath>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill={backgroundColor}
          clipPath="url(#statusBadgeClip)"
        />
      </Svg>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    width: 92,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    position: 'absolute',
    color: '#ffffff',
    ...typography['label-caps'],
    fontSize: 10,
    fontWeight: '700',
  },
});
