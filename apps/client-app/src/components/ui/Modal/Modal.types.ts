import type { PropsWithChildren, ReactNode } from 'react';

export interface ModalProps extends PropsWithChildren {
  /** 是否可见 */
  visible: boolean;
  /** 关闭回调（点击遮罩或 X 按钮） */
  onClose?: () => void;
  /** 标题（可选，提供则渲染标题栏） */
  title?: string;
  /** 底部操作区（按钮组） */
  footer?: ReactNode;
  /** 是否可关闭（点击遮罩关闭）。默认 true */
  dismissable?: boolean;
  /** 测试 ID */
  testID?: string;
}
