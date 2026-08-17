export interface SwitchProps {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
  // P17-B1 审查 Q1：无 label 模式（外层行已有文字 label）下，屏阅读器专用标签
  // （默认 common.toggle 太通用，多行并列时无法区分——如设置页三行通知偏好）
  accessibilityLabel?: string;
}
