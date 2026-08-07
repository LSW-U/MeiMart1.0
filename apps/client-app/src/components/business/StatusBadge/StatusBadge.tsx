import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClipPath, Defs, Polygon, Rect, Svg } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { typography } from '@/theme';

import type { StatusBadgeProps } from './StatusBadge.types';

export function StatusBadge({ text, backgroundColor, testID }: StatusBadgeProps) {
  // Why: a11y 标签前缀 i18n（Status: XXX），避免读屏对 zh/tet 用户读英文
  const { t } = useTranslation();
  const w = 92;
  const h = 22;
  const offset = 8;
  return (
    <View
      testID={testID}
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={t('order.statusBadgeA11y', { status: text, defaultValue: 'Status: {{status}}' })}
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
    // Why: 文字色固定白——bg 由调用方传入饱和色（#F97316 / #059669 等，不随 theme 变），
    // 文字须保持固定高对比色。dark mode 适配需改为 textColor prop 由调用方传，留 follow-up。
    color: '#ffffff',
    ...typography['label-caps'],
    fontSize: 10,
    fontWeight: '700',
  },
});
