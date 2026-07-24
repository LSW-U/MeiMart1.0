/**
 * PageErrorBoundary - 页面级错误隔离
 *
 * Why: 根布局有全局 ErrorBoundary，但页面崩溃会触发全局 fallback 导致整个 App 不可用
 * 页面级 ErrorBoundary 隔离崩溃：某页崩溃只影响该页，其他页仍可用
 *
 * 用法：
 *   export default function HomePage() {
 *     return (
 *       <PageErrorBoundary>
 *         <SafeAreaWrapper>...</SafeAreaWrapper>
 *       </PageErrorBoundary>
 *     );
 *   }
 */
import { Component, type ReactNode } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { captureError } from '@/services/sentry';

interface Props {
  children: ReactNode;
  /** 页面名，用于错误日志标识 */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureError(error, { componentStack: errorInfo.componentStack, extra: { page: this.props.pageName } });
    console.error('[PageErrorBoundary]', this.props.pageName, error, errorInfo.componentStack);
  }

  handleBack = () => {
    this.setState({ hasError: false, error: undefined });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(main)/home');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵</Text>
          <Text style={styles.title}>页面出错了</Text>
          <Text style={styles.message} numberOfLines={3}>
            {this.state.error?.message ?? '页面渲染异常，请返回重试'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleBack}>
            <Text style={styles.buttonText}>返回</Text>
          </Pressable>
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
    gap: 12,
    padding: 24,
    backgroundColor: '#fef2f2', // 原因：错误边界自洽，不依赖 ThemeProvider（Provider 崩溃时仍需渲染）
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626', // 原因：错误边界自洽错误红
  },
  message: {
    fontSize: 13,
    color: '#991b1b', // 原因：错误边界自洽深错误红
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#961813', // 原因：错误边界自洽品牌红 CTA
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
