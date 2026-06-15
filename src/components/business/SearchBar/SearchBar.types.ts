export type SearchBarVariant = 'card' | 'embedded';

export interface SearchBarProps {
  /** 受控值 */
  value?: string;
  /** 非受控初值 */
  defaultValue?: string;
  /** 占位符 */
  placeholder?: string;
  /**
   * 样式变体：
   * - 'card'（默认）：白底 + shadow-sm + border + 12px 圆角（HomePage 风格）
   * - 'embedded'：半透明背景 + 胶囊形 + 无 shadow（嵌入 primary header 时用）
   */
  variant?: SearchBarVariant;
  /** 显示麦克风按钮（SearchPage 用），点击触发 onMicPress */
  showMic?: boolean;
  onMicPress?: () => void;
  /** 搜索图标颜色（HomePage 用 outline 灰，SearchPage 用 primary 红） */
  iconColor?: string;
  /** 提交搜索 */
  onSearch?: (query: string) => void;
  /** 文本变化 */
  onChange?: (query: string) => void;
  /** 提交回调（别名） */
  onSubmit?: (query: string) => void;
  /** 点击清除按钮 */
  onClear?: () => void;
  /** 自动聚焦 */
  autoFocus?: boolean;
  testID?: string;
}
