import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { toIconName } from '@/types';
import type { EmptyStateProps } from './EmptyState.types';

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: colors['surface-container-lowest'] }]}
      accessibilityRole="text"
      accessibilityLabel={title}
    >
      <MaterialCommunityIcons
        name={toIconName(icon)}
        size={64}
        color={colors['on-surface-variant']}
      />
      <Text style={[textStyle('h3'), { color: colors['on-surface'], textAlign: 'center' }]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[
            textStyle('body-md'),
            { color: colors['on-surface-variant'], textAlign: 'center' },
          ]}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          variant="primary"
          size="md"
          onPress={onAction}
          style={styles.action}
        />
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
  action: { marginTop: spacing.sm },
});
