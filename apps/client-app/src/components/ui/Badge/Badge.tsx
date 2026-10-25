import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

import type { BadgeProps } from './Badge.types';

export function Badge({
  count = 0,
  variant = 'number',
  maxCount = 99,
  color,
  accessibilityLabel,
  hideFromA11y = false,
  style,
}: BadgeProps) {
  const { colors } = useTheme();
  // P1-12：a11y 兜底文案 i18n 化（原硬编码英文 'New notification'/'N notifications'）
  const { t } = useTranslation();

  if (count <= 0) {
    return null;
  }

  const bgColor = color ?? colors.primary;
  const displayCount = count > maxCount ? `${maxCount}+` : String(count);

  if (variant === 'dot') {
    return (
      <View
        testID="badge-dot"
        style={[styles.dot, { backgroundColor: bgColor }, style]}
        accessibilityLabel={
          hideFromA11y ? undefined : (accessibilityLabel ?? t('common.a11y.newNotification'))
        }
        accessibilityRole={hideFromA11y ? undefined : 'image'}
      />
    );
  }

  return (
    <View
      testID="badge-number"
      style={[styles.number, { backgroundColor: bgColor }, style]}
      accessibilityLabel={
        // 审查批B判断题4：count=1 用单数文案，避免 "1 notifications"
        hideFromA11y
          ? undefined
          : (accessibilityLabel ??
            (count === 1
              ? t('common.a11y.newNotification')
              : t('common.a11y.notificationCount', { count })))
      }
      accessibilityRole={hideFromA11y ? undefined : 'image'}
    >
      <Text style={[styles.label, { color: colors['on-primary'] }]}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    minWidth: 8,
    height: 8,
    borderRadius: 4,
    paddingHorizontal: 0,
  },
  number: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
