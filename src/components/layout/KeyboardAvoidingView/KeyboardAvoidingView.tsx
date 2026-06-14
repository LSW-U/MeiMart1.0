import { StyleSheet, KeyboardAvoidingView as RNKeyboardAvoidingView } from 'react-native';
import { useTheme } from '@/theme';
import type { KeyboardAvoidingWrapperProps } from './KeyboardAvoidingView.types';

export function KeyboardAvoidingWrapper({ children, testID }: KeyboardAvoidingWrapperProps) {
  const { colors } = useTheme();
  return (
    <RNKeyboardAvoidingView
      testID={testID}
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {children}
    </RNKeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
