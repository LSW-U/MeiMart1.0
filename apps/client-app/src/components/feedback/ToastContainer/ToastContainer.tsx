// ToastContainer — 全局 Toast 渲染容器
// 放在 AppProviders 顶层，自动渲染所有 active toast
import { StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/store/toastStore';
import { useTheme, spacing, shadowPresets, borderRadius } from '@/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ToastType } from '@/store/toastStore';

const ICON_MAP: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

const COLOR_KEY: Record<ToastType, 'tertiary' | 'error' | 'primary'> = {
  success: 'tertiary',
  error: 'error',
  info: 'primary',
};

export function ToastContainer() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + spacing.md }]} pointerEvents="box-none">
      {toasts.map((t) => {
        const colorKey = COLOR_KEY[t.type];
        const bgColor = colors[colorKey];
        const fgColor = t.type === 'error' ? colors['on-error'] : colors['on-primary'];
        return (
          <View
            key={t.id}
            style={[
              styles.toast,
              { backgroundColor: bgColor, borderRadius: borderRadius.lg },
              shadowPresets.lg,
            ]}
          >
            <MaterialCommunityIcons name={ICON_MAP[t.type] as never} size={20} color={fgColor} />
            <Text style={[styles.text, { color: fgColor }]}>{t.message}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    maxWidth: 400,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
