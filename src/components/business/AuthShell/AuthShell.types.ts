import type { ReactNode } from 'react';

export interface AuthShellProps {
  /** Welcome card 主标题 */
  welcomeTitle: string;
  /** Welcome card 副标题 */
  welcomeSub: string;
  /** 主按钮文字（如 "Sign In" / "Register" / "Reset Password"） */
  actionLabel: string;
  /** 主按钮回调 */
  onAction: () => void;
  /** 主按钮 loading 状态 */
  loading?: boolean;
  /** 表单内容（Input / Checkbox 等） */
  children: ReactNode;
  /** 次要操作区（"New to Mei Mart?" 等） */
  secondary?: ReactNode;
  testID?: string;
}
