export interface SearchBarProps {
  /** 受控值 */
  value?: string;
  /** 非受控初值 */
  defaultValue?: string;
  /** 占位符 */
  placeholder?: string;
  /** 提交搜索（点击软键盘 search 键或回车） */
  onSearch?: (query: string) => void;
  /** 文本变化（别名 onSearchChange） */
  onChange?: (query: string) => void;
  /** 提交回调（别名） */
  onSubmit?: (query: string) => void;
  /** 点击清除按钮 */
  onClear?: () => void;
  /** 自动聚焦 */
  autoFocus?: boolean;
  testID?: string;
}
