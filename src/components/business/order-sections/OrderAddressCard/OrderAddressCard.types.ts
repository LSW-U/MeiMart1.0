import type { Address } from '@/types';

export interface OrderAddressCardProps {
  address: Address;
  /** 卡片标题，默认 t('order.shippingInfo') */
  title?: string;
  /** 右上角"编辑/修改"按钮回调，不传则不显示 */
  onEdit?: () => void;
  editLabel?: string;
  testID?: string;
}
