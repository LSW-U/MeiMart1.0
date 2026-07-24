import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { captureError } from '@/services/sentry';
import type { ErrorBoundaryProps, ErrorBoundaryState } from './ErrorBoundary.types';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    captureError(error, { componentStack: errorInfo.componentStack });
    // Why: 兜底错误必须打到 console，否则被 React 吞掉后无法定位第一层错误
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Why: 兜底 fallback 必须 self-contained，不依赖 useTheme/i18n
      // 否则 ThemeProvider 自身 crash 时会连环抛错
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          {this.state.error?.message ? (
            <Text style={styles.message}>{this.state.error.message}</Text>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: '#fef2f2', // 原因：错误边界自洽，不依赖 ThemeProvider（Provider 崩溃时仍需渲染）
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626', // 原因：错误边界自洽错误红
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#991b1b', // 原因：错误边界自洽深错误红
    textAlign: 'center',
  },
});
