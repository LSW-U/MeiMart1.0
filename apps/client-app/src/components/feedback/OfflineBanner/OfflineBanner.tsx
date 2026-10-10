import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing } from '@/theme';
import type { OfflineBannerProps, WeakNetworkBannerProps } from './OfflineBanner.types';

export function OfflineBanner({ onRetry, testID }: OfflineBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: colors.error }]}
      accessibilityRole="alert"
      accessibilityLabel={t('common.youAreOffline')}
    >
      <MaterialCommunityIcons name="wifi-off" size={20} color={colors['on-error']} />
      {/* B-P2-4: 可见文案走 t()（a11y label 已接线，此处补齐可见文案，复用既有 key） */}
      <Text style={[textStyle('body-md'), { color: colors['on-error'], flex: 1 }]}>
        {t('common.youAreOffline')}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
        >
          <Text style={[textStyle('body-md'), { color: colors['on-error'], fontWeight: '700' }]}>
            {t('common.retry')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function WeakNetworkBanner({ testID }: WeakNetworkBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: colors.semantic.warning }]}
      accessibilityRole="alert"
      accessibilityLabel={t('common.weakNetwork')}
    >
      <MaterialCommunityIcons name="signal-cellular-2" size={20} color={colors['on-error']} />
      <Text style={[textStyle('body-md'), { color: colors['on-error'] }]}>
        {t('common.weakNetwork')}
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
