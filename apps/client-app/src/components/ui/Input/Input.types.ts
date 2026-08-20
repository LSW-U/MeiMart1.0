import type { TextInputProps } from 'react-native';
import type { IconName, MaterialSymbolName } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** 标签（输入框上方） */
  label?: string;
  /** 错误信息（错误态） */
  error?: string;
  /** 左侧图标名（HTML Material Symbols 名或 MC 名，经 iconMapping 解析；P29 审查 F2 收窄为联合类型保留拼写校验） */
  leftIcon?: IconName | MaterialSymbolName;
  /** 右侧图标名 */
  rightIcon?: IconName | MaterialSymbolName;
  /**
   * P29-D10: 输入框内左侧固定前缀块（如 '+670'），右侧带分隔线。
   * 与 address/edit 的 phonePrefix 模式一致，auth 4 页手机号输入统一
   */
  prefix?: string;
  /**
   * 视觉变体（dev 反馈 20260820）：
   * - filled（默认）：surface-variant 底 + outline-variant 边框（auth 表单/搜索等独立输入场景）
   * - bare：无底色无边框——行式卡片内嵌输入（profile/edit 的昵称/邮箱行，卡片自身是白底）
   */
  variant?: 'filled' | 'bare';
  /** 点击右侧图标回调 */
  onRightIconPress?: () => void;
  /** 当前值 */
  value?: string;
  /** 文本变化回调 */
  onChangeText?: (text: string) => void;
  /** 辅助说明 */
  helperText?: string;
  /** 禁用状态（映射到 TextInput editable={false}） */
  disabled?: boolean;
}
