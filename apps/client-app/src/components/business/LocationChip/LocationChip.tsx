import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme, spacing, typography } from '@/theme';
import { Icon } from '@/components/ui/Icon';

import type { LocationChipProps } from './LocationChip.types';

// P1-15：home / PrimaryHeader 两处逐字段复制的位置胶囊收敛为单一组件
// （rgba 白 18% 底 / 999 胶囊 / maxWidth 150 / location_on + 文本 + expand_more）。
// 前景默认 on-primary 跟随主题；home 深红渐变 header（不随主题）由调用方传固定白。
export function LocationChip({ label, onPress, color, testID }: LocationChipProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const fg = color ?? colors['on-primary'];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={t('common.a11y.locationChip', { location: label })}
    >
      <Icon symbol="location_on" size={13} color={fg} />
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      <Icon symbol="expand_more" size={13} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    // 原因（审查批B判断题1 豁免注记）：白 18% 胶囊底系 home/PrimaryHeader 既有视觉签名，
    // 叠深红 header 上 dark 不变——同 ON_PRIMARY 固定色模式（P6 审查 Q1）；P1-15 系收敛搬运非新色
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 150,
  },
  text: {
    ...typography['body-sm'],
    fontSize: 12,
    flexShrink: 1,
  },
});
