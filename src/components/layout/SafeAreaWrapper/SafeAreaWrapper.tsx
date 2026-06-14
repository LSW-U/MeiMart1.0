import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import type { SafeAreaWrapperProps } from './SafeAreaWrapper.types';

export function SafeAreaWrapper({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  testID,
  style,
}: SafeAreaWrapperProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={[styles.container, { backgroundColor: colors.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
