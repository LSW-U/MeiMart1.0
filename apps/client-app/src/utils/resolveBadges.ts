import type { TFunction } from 'i18next';
import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §8 - badge 规则集中派生
//   替代 home getRecommendBadge（按位置写死）/ categories salesCount>100（语义不通）
//   / product/list LOCAL SPECIALTY（纯硬编码）。
//   批D（商品详情整合）D3：BEST SELLER 已切模式 A —— 消费后端直出 isCategoryTop3
//   （批B 聚合接口「同分类 ACTIVE salesCount Top3」），删除前端 salesCount>500 猜测
//   （原 BEST_SELLER_THRESHOLD 常量）。字段缺失（列表契约未带/未同步）时不显示徽章，
//   宁缺毋假。NEW / TOP RATED / LOCAL SPECIALTY 仍为模式 B 前端派生。

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const TOP_RATED_THRESHOLD = 4.8;

/**
 * 按商品属性派生 badge（最多 2 个，避免遮挡）
 * - NEW：createdAt 7 天内
 * - BEST SELLER：isCategoryTop3（后端直出，字段缺失不显示）
 * - TOP RATED：rating >= 4.8
 * - LOCAL SPECIALTY：isLocal
 */
export function resolveBadges(product: Product, t: TFunction): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (product.createdAt) {
    const created = new Date(product.createdAt).getTime();
    if (!Number.isNaN(created) && Date.now() - created < NEW_WINDOW_MS) {
      badges.push({ label: t('common.badgeNew'), variant: 'new' });
    }
  }

  if (product.isCategoryTop3) {
    badges.push({ label: t('product.badgeBestSeller'), variant: 'best-seller' });
  }

  if (product.rating != null && product.rating >= TOP_RATED_THRESHOLD) {
    badges.push({ label: t('product.badgeTopRated'), variant: 'top-rated' });
  }

  if (product.isLocal) {
    badges.push({ label: t('product.badgeLocal'), variant: 'local' });
  }

  return badges.slice(0, 2);
}
