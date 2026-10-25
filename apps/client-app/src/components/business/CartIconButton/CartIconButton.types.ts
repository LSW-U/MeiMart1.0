import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export interface CartIconButtonProps {
  /** 购物车内商品数（0 不渲染角标） */
  count: number;
  /** 购物车 icon 颜色（各页 header 底色不同） */
  iconColor: string;
  onPress: () => void;
  /** a11y（含数量，调用方 t('cart.a11y.itemCount')） */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  /** 角标定位覆盖（默认 {absolute, top:2, right:0}） */
  badgeStyle?: StyleProp<ViewStyle>;
  hitSlop?: PressableProps['hitSlop'];
  testID?: string;
}
