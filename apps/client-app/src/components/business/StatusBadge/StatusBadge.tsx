import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ClipPath, Defs, Polygon, Rect, Svg } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { textStyle } from '@/theme';

import type { StatusBadgeProps } from './StatusBadge.types';

// P0-1（方案 v2 §三）：pt/tet 长状态文案（最长 33 字符）会横向压出固定 92px 底形——
// wrap 改 minWidth，Svg 底形宽度由 Text onLayout 实测驱动（下限 92），短文案尺寸不变。
const MIN_W = 92;
const H = 22;
const OFFSET = 8;
// 文字两侧留白需 > OFFSET 斜切量，保证首尾字符不被平行四边形斜边压住
const TEXT_PAD = 14;

export function StatusBadge({ text, backgroundColor, textColor, testID }: StatusBadgeProps) {
  // Why: a11y 标签前缀 i18n（Status: XXX），避免读屏对 zh/tet 用户读英文
  const { t } = useTranslation();
  const [w, setW] = useState(MIN_W);
  return (
    <View
      testID={testID}
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={t('order.statusBadgeA11y', {
        status: text,
        defaultValue: 'Status: {{status}}',
      })}
    >
      <Svg width={w} height={H} style={styles.bg}>
        <Defs>
          <ClipPath id="statusBadgeClip">
            <Polygon points={`${OFFSET},0 ${w},0 ${w - OFFSET},${H} 0,${H}`} />
          </ClipPath>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={w}
          height={H}
          fill={backgroundColor}
          clipPath="url(#statusBadgeClip)"
        />
      </Svg>
      <Text
        style={[styles.text, textColor ? { color: textColor } : undefined]}
        numberOfLines={1}
        onLayout={(e) => {
          // Text 布局宽（含 paddingHorizontal）即徽章需宽；仅值变化时 setState 防循环
          const need = Math.max(MIN_W, Math.ceil(e.nativeEvent.layout.width));
          setW((prev) => (prev === need ? prev : need));
        }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    minWidth: MIN_W,
    height: H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  text: {
    paddingHorizontal: TEXT_PAD,
    // Why: 文字色默认白——bg 由调用方传入饱和色（#B45309 / #059669 等，不随 theme 变），
    // 白字两主题恒高对比；P1-16 起支持 textColor prop 覆盖（dark 适配入口，见 types 注释）。
    color: '#ffffff',
    // 审查批A判断题1：11px 档收敛 label-caps-sm token（textStyle 解析 Bold 字族后缀，
    // 替代 typography 直铺 + 内联 fontSize，三处 11 魔法数单一来源化）
    ...textStyle('label-caps-sm'),
  },
});
