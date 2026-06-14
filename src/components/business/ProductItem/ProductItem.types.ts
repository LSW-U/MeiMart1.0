import type { CartItem } from '@/types';

export interface ProductItemProps {
  item: CartItem;
  onPress?: (item: CartItem) => void;
  testID?: string;
}
