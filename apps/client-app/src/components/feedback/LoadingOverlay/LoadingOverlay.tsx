import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { useTheme, textStyle } from '@/theme';
import type { LoadingOverlayProps } from './LoadingOverlay.types';

export function LoadingOverlay({ visible, message, testID }: LoadingOverlayProps) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" testID={testID}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View
          style={[styles.content, { backgroundColor: colors['surface-container-lowest'] }]}
          accessibilityRole="progressbar"
          accessibilityLabel={message ?? 'Loading'}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          {message && (
            <Text style={[textStyle('body-md'), { color: colors['on-surface'] }]}>{message}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
});
