import type { ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  testID?: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
