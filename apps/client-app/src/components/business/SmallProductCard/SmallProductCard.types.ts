import type { Product } from '@/types';

// Why: 全局卡片统一方案 §4 - 横滑小卡统一组件（home Buy Again + cart People Also Bought）
export interface SmallProductCardProps {
  product: Product;
  onPress: () => void; // 点击图片/名称跳详情
  onAddToCart: () => void; // 加购
  testID?: string;
}
