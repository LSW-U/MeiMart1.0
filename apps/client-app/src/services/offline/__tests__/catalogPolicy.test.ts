/**
 * catalogPolicy 分层 TTL 单测（轻量化省流批2 ③）
 *
 * 覆盖：档位单调性（详情 ≤ 列表 ≤ banner ≤ 分类）+ queryKey 判定边界。
 * 目录 hook 消费 CATALOG_TTL 的接线由 useCatalog.ts 引用保证（值断言防手改漂移）。
 */
import { CATALOG_TTL, isCatalogQueryKey } from '../catalogPolicy';

describe('CATALOG_TTL 分层档位', () => {
  it('敏感度单调：详情 ≤ 列表 ≤ banner ≤ 分类（断网价值越高 TTL 越长）', () => {
    expect(CATALOG_TTL.productDetail).toBeLessThanOrEqual(CATALOG_TTL.productList);
    expect(CATALOG_TTL.productList).toBeLessThanOrEqual(CATALOG_TTL.banners);
    expect(CATALOG_TTL.banners).toBeLessThanOrEqual(CATALOG_TTL.categories);
  });

  it('档位落合理区间（1h 内详情、24h 内分类——防手改成天级或秒级）', () => {
    expect(CATALOG_TTL.productDetail).toBeGreaterThanOrEqual(5 * 60 * 1000);
    expect(CATALOG_TTL.categories).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('useCatalog 消费同源（分类 24h / banner 12h）', () => {
    expect(CATALOG_TTL.categories).toBe(24 * 60 * 60 * 1000);
    expect(CATALOG_TTL.banners).toBe(12 * 60 * 60 * 1000);
  });

  // P2-1（批2 审查）：4 档全接线断言——productList/productDetail 由 useProducts.ts 消费，
  // 防手改漂移或回退硬编码 5min（值断言与消费方引用共同锁死口径：列表 30min / 详情 10min）
  it('useProducts 消费同源（列表 30min / 详情 10min，4 档全接线）', () => {
    expect(CATALOG_TTL.productList).toBe(30 * 60 * 1000);
    expect(CATALOG_TTL.productDetail).toBe(10 * 60 * 1000);
  });
});

describe('isCatalogQueryKey', () => {
  it('四类目录 key 命中（含带参后段）', () => {
    expect(isCatalogQueryKey(['categories'])).toBe(true);
    expect(isCatalogQueryKey(['banners'])).toBe(true);
    expect(isCatalogQueryKey(['products', 'search', 'milk'])).toBe(true);
    expect(isCatalogQueryKey(['product', 'p001'])).toBe(true);
  });

  it('非目录 key 不命中（user/orders 前缀外键）', () => {
    expect(isCatalogQueryKey(['user', 'profile'])).toBe(false);
    expect(isCatalogQueryKey(['orders'])).toBe(false);
    expect(isCatalogQueryKey([])).toBe(false);
    expect(isCatalogQueryKey([42])).toBe(false);
  });
});
