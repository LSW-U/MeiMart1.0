export interface CheckboxProps {
  /** 当前是否选中 */
  checked: boolean;
  /** 切换回调 */
  onChange?: (next: boolean) => void;
  /** 标签（可选，渲染在右侧） */
  label?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 测试 ID */
  testID?: string;
}
