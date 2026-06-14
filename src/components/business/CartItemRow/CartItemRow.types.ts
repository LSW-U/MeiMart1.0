import type { CartItem } from '@/types';

export interface CartItemRowProps {
  item: CartItem;
  onPress?: (item: CartItem) => void;
  onQuantityChange?: (quantity: number) => void;
  onDelete?: (item: CartItem) => void;
  showControls?: boolean;
  testID?: string;
}
