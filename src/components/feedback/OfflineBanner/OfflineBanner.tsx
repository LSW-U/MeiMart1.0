import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import type { OfflineBannerProps, WeakNetworkBannerProps } from './OfflineBanner.types';

export function OfflineBanner({ onRetry, testID }: OfflineBannerProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: colors.error }]}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
    >
      <MaterialCommunityIcons name="wifi-off" size={20} color={colors['on-error']} />
      <Text style={[textStyle('body-md'), { color: colors['on-error'], flex: 1 }]}>
        You are offline. Some features may not work.
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text style={[textStyle('body-md'), { color: colors['on-error'], fontWeight: '700' }]}>
            Retry
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function WeakNetworkBanner({ testID }: WeakNetworkBannerProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: colors.semantic.warning }]}
      accessibilityRole="alert"
      accessibilityLabel="Weak network connection"
    >
      <MaterialCommunityIcons name="signal-cellular-2" size={20} color="#fff" />
      <Text style={[textStyle('body-md'), { color: '#fff' }]}>
        Weak network. Loading may be slower.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
