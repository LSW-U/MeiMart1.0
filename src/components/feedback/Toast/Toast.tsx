import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, borderRadius } from '@/theme';
import type { ToastProps } from './Toast.types';

const TYPE_CONFIG: Record<string, { icon: string; colorKey: string }> = {
  success: { icon: 'check-circle', colorKey: 'tertiary' },
  error: { icon: 'alert-circle', colorKey: 'error' },
  info: { icon: 'information', colorKey: 'primary' },
};

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  testID,
}: ToastProps) {
  const { colors } = useTheme();
  const config = TYPE_CONFIG[type];
  const bgColor = colors[config.colorKey as keyof typeof colors] ?? colors.primary;
  const textColor = type === 'error' ? colors['on-error'] : colors['on-primary'];

  useEffect(() => {
    if (visible && duration > 0 && onHide) {
      const timer = setTimeout(onHide, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <View
      testID={testID}
      style={[styles.toast, { backgroundColor: bgColor as string, borderRadius: borderRadius.lg }]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <MaterialCommunityIcons name={config.icon as any} size={20} color={textColor} />
      <Text style={[textStyle('body-md'), { color: textColor, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
  },
});
