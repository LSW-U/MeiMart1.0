/**
 * resolveBadges 单元测试（批D D3 热销徽章切模式 A）
 *
 * 关键回归点：BEST_SELLER_THRESHOLD（salesCount>500）前端猜测已删，
 * BEST SELLER 徽章只消费后端直出 isCategoryTop3；字段缺失时不显示（宁缺毋假）。
 * NEW / TOP RATED / LOCAL SPECIALTY 仍为模式 B 前端派生，不受影响。
 */
import type { TFunction } from 'i18next';
import { resolveBadges } from '@/utils/resolveBadges';
import type { Product } from '@/types';

const t = ((key: string) => key) as TFunction;

const makeProduct = (over: Partial<Product> = {}): Product => ({
  id: 'p001',
  name: { en: 'Fresh Red Fuji Apple', zh: '新鲜红富士苹果', tet: 'Maçã Fuji', pt: 'Maçã Fuji' },
  price: 25.9,
  image: 'https://cdn.example.com/p001.jpg',
  category: 'c002',
  ...over,
});

describe('resolveBadges（批D D3）', () => {
  describe('BEST SELLER — 模式 A：只认 isCategoryTop3', () => {
    it('isCategoryTop3=true → best-seller 徽章', () => {
      const badges = resolveBadges(makeProduct({ isCategoryTop3: true }), t);
      expect(badges).toContainEqual({ label: 'product.badgeBestSeller', variant: 'best-seller' });
    });

    it('salesCount 再高、无 isCategoryTop3 → 不显示（500 阈值猜测已删，宁缺毋假）', () => {
      const badges = resolveBadges(makeProduct({ salesCount: 99999 }), t);
      expect(badges).toEqual([]);
    });

    it('isCategoryTop3=false（非 Top3）→ 不显示', () => {
      const badges = resolveBadges(makeProduct({ salesCount: 9999, isCategoryTop3: false }), t);
      expect(badges).toEqual([]);
    });
  });

  describe('其余徽章不受影响（模式 B 前端派生）', () => {
    it('TOP RATED：rating>=4.8', () => {
      const badges = resolveBadges(makeProduct({ rating: 4.9 }), t);
      expect(badges).toContainEqual({ label: 'product.badgeTopRated', variant: 'top-rated' });
    });

    it('NEW：createdAt 7 天内', () => {
      const badges = resolveBadges(makeProduct({ createdAt: new Date().toISOString() }), t);
      expect(badges).toContainEqual({ label: 'common.badgeNew', variant: 'new' });
    });

    it('LOCAL SPECIALTY：isLocal', () => {
      const badges = resolveBadges(makeProduct({ isLocal: true }), t);
      expect(badges).toContainEqual({ label: 'product.badgeLocal', variant: 'local' });
    });

    it('最多 2 个（NEW+TOP RATED 同存时 LOCAL 被截断）', () => {
      const badges = resolveBadges(
        makeProduct({
          createdAt: new Date().toISOString(),
          rating: 4.9,
          isLocal: true,
        }),
        t,
      );
      expect(badges).toHaveLength(2);
      expect(badges.map((b) => b.variant)).toEqual(['new', 'top-rated']);
    });
  });

  describe('NEAR EXPIRY — P3批1 冒烟收尾（模式 A 后端直出，优先级最高）', () => {
    it('isNearExpiry=true → near-expiry 徽章在 [0]（压过 isCategoryTop3 的 best-seller）', () => {
      const badges = resolveBadges(makeProduct({ isNearExpiry: true, isCategoryTop3: true }), t);
      expect(badges[0]).toEqual({ label: 'product.badgeNearExpiry', variant: 'near-expiry' });
      expect(badges).toContainEqual({ label: 'product.badgeBestSeller', variant: 'best-seller' });
    });

    it('isNearExpiry=true + 三个营销徽章同存 → [near-expiry, 首个营销徽章]，slice(0,2) 语义保持', () => {
      const badges = resolveBadges(
        makeProduct({
          isNearExpiry: true,
          isCategoryTop3: true,
          createdAt: new Date().toISOString(),
          rating: 4.9,
        }),
        t,
      );
      expect(badges).toHaveLength(2);
      expect(badges[0].variant).toBe('near-expiry');
      expect(badges[1].variant).toBe('new'); // 派生顺序：near-expiry → NEW → best-seller，截断后留第一个营销徽章
    });

    it('isNearExpiry=false → 不产 near-expiry', () => {
      const badges = resolveBadges(makeProduct({ isNearExpiry: false, isCategoryTop3: true }), t);
      expect(badges.map((b) => b.variant)).not.toContain('near-expiry');
      expect(badges[0].variant).toBe('best-seller');
    });

    it('isNearExpiry 缺失（undefined）→ 不产（宁缺毋假）', () => {
      const badges = resolveBadges(makeProduct({ isCategoryTop3: true }), t);
      expect(badges.map((b) => b.variant)).toEqual(['best-seller']);
    });
  });
});
