// 商品详情页共享常量/纯函数（批5 拆分：从 app/product/[id].tsx 原样搬移，行为零变更）
import { Dimensions, View } from 'react-native';
import { useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { WarehouseAvailability } from '@/types';

export const SCREEN_WIDTH = Dimensions.get('window').width;
// D-V4：轮播 slide 固定高（P1 优化原型 .carousel .slide height:380px）
export const CAROUSEL_HEIGHT = 380;

export const TABS = ['PRODUCT', 'REVIEWS', 'RECOMMENDED', 'DETAILS'] as const;
export type TabKey = (typeof TABS)[number];

// 配对商品（HTML 第 376-408 行）— 用真实 mockDb id，数据从 useProducts 动态拉取
export const PAIRS_WELL_WITH_IDS = ['p003', 'p005', 'p008'];

// {t('product.relatedProducts')}（HTML 第 418-437 行）— 用真实 mockDb id
export const YOU_MAY_LIKE_IDS = ['p006', 'p009'];

// §7 库存状态：充足 / 紧张 / 断货 / 未知（后端不返回 stock 时降级为「有货」绿点）
// 批D D4：紧张阈值 1-20 → ≤5（仅剩 N 件提示、步进上限联动口径同步收窄）
export type StockState = 'plenty' | 'low' | 'out' | 'unknown';
export function computeStockState(stock: number | undefined): StockState {
  if (stock == null) return 'unknown';
  if (stock === 0) return 'out';
  if (stock <= 5) return 'low';
  return 'plenty';
}

// P2-2（批D 审查修复）D5 三态派生：有货 / 仓售罄 / 无货（无匹配仓），消费契约 matchedWarehouseId + quantity
// - 有货：available && quantity>0 && 仓名（仓名插值展示）
// - 仓售罄：匹配到仓（matchedWarehouseId 非空）但 quantity=0
// - 无货：matchedWarehouseId=null（无匹配仓）
// 仓名缺失降级为通用无货文案 —— 契约下 matched 必带 name，此分支仅防御
// 「available=true 但 name=null」的语义反转（审查 P2-2 弱瑕疵）
export type WarehouseUiState = 'inStock' | 'soldOut' | 'noStock';
export function deriveWarehouseState(d: WarehouseAvailability): WarehouseUiState {
  if (d.available && d.quantity > 0 && d.warehouseName) return 'inStock';
  if (d.matchedWarehouseId != null && d.warehouseName) return 'soldOut';
  return 'noStock';
}

// 星级行：按 rating 亮 N 颗星（评论卡按评分填充），默认全亮（评分汇总区装饰用）
export function StarsRow({ size = 14, rating = 5 }: { size?: number; rating?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          symbol="star"
          size={size}
          color={n <= rating ? colors['tertiary-container'] : colors['outline-variant']}
        />
      ))}
    </View>
  );
}
