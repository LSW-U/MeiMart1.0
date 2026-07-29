import type { TFunction } from 'i18next';
import type { Product } from '@/types';
import type { ProductBadge } from '@/components/business/ProductCard/ProductCard.types';

// Why: 全局卡片统一方案 §8 - badge 前端规则派生（模式 B）
//   替代 home getRecommendBadge（按位置写死）/ categories salesCount>100（语义不通）
//   / product/list LOCAL SPECIALTY（纯硬编码）。集中规则，后续切后端直出（模式 A）只改这里。

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const BEST_SELLER_THRESHOLD = 500;
const TOP_RATED_THRESHOLD = 4.8;

/**
 * 按商品属性派生 badge（最多 2 个，避免遮挡）
 * - NEW：createdAt 7 天内
 * - BEST SELLER：salesCount > 500
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

  if (product.salesCount != null && product.salesCount > BEST_SELLER_THRESHOLD) {
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
