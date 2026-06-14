export interface CheckboxProps {
  /** 当前是否选中 */
  checked: boolean;
  /** 切换回调（点击时触发） */
  onChange?: (next: boolean) => void;
  /** 点击回调（与 onChange 二选一，更直观） */
  onPress?: () => void;
  /** 标签（可选，渲染在右侧） */
  label?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 测试 ID */
  testID?: string;
  /** 无障碍标签 */
  accessibilityLabel?: string;
}
