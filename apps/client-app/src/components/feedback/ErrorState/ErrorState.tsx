import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import type { ErrorStateProps } from './ErrorState.types';

export function ErrorState({ message, onRetry, testID }: ErrorStateProps) {
  const { colors } = useTheme();
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
        <Button label="Retry" variant="outline" size="md" onPress={onRetry} style={styles.retry} />
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
