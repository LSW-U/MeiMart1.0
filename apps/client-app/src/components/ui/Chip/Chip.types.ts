export interface ChipProps {
  /** 显示文字 */
  label: string;
  /** 选中状态 */
  selected: boolean;
  /** 切换选中回调 */
  onSelect?: (next: boolean) => void;
  /** 禁用 */
  disabled?: boolean;
  /** 测试 ID */
  testID?: string;
  /** 图标名（@expo/vector-icons MaterialCommunityIcons） */
  icon?: string;
}
