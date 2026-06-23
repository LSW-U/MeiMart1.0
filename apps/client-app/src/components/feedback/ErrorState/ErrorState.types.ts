export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  testID?: string;
}
