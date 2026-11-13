import type { StyleProp, ViewStyle } from 'react-native';

/** 方案 C（20261112 拍板）：ref 命令式收面板——页面滚动容器 onScroll 里调 dismissPanel() */
export interface FloatingCartBarRef {
  dismissPanel: () => void;
}

export interface FloatingCartBarProps {
  /** Why: 组件自取 useCart()（同 BottomNav 模式，调用方零 props）；count 仅供测试注入覆盖 */
  count?: number;
  total?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
