import { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTheme, textStyle } from '@/theme';
import { ErrorState } from '@/components/feedback/ErrorState';
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
    // TODO: Sentry integration in production
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorState message="Something went wrong" testID={this.props.testID} />;
    }
    return this.props.children;
  }
}
