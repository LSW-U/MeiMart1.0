export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  /** 重试按钮文案（默认 "Retry"）；401 登录失效场景传「去登录」等 */
  retryLabel?: string;
  testID?: string;
}
