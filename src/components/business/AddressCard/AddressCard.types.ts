import type { Address } from '@/types';

export interface AddressCardProps {
  address: Address;
  onPress?: (address: Address) => void;
  onEdit?: (address: Address) => void;
  onDelete?: (address: Address) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (address: Address) => void;
  testID?: string;
}
