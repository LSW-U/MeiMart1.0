import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, textStyle, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { ErrorStateProps } from './ErrorState.types';

export function ErrorState({ message, onRetry, retryLabel, testID }: ErrorStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: colors['surface-container-lowest'] }]}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${message}`}
    >
      <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={[textStyle('body-md'), { color: colors['on-surface'], textAlign: 'center' }]}>
        {message}
      </Text>
      {onRetry && (
        // T2-B: 兜底文案接 i18n（原 'Retry' 英文硬编码，E10 合规）
        <Button label={retryLabel ?? t('common.retry')} variant="outline" size="md" onPress={onRetry} style={styles.retry} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  retry: { marginTop: spacing.sm },
});
