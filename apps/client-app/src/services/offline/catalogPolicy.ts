/**
 * 商品目录离线缓存分层策略（轻量化省流批2 ③，方案v2 §三批2）
 *
 * 分层（基于既有 persist 基建，不新建基建——persist.ts 已把 categories/products/product
 * 落 AsyncStorage，offlineFirst 已保证断网读缓存）：
 *   L1 内存热缓存：react-query queryCache（全局 gcTime 24h，queryClient.ts）
 *   L2 持久层：AsyncStorage persister（persist.ts，maxAge 7d 全局）
 *   L3 图片盘缓存：expo-image cachePolicy="memory-disk"（SafeImage）
 *
 * 本模块补的是「分层 TTL」：目录类数据（分类/banner/商品列表）变更频率低、
 * 断网浏览价值高，给比全局 staleTime 60s 更长的档位；断网冷启动时
 * persister 恢复的缓存 + offlineFirst 使目录页直接可渲染（A5 验收线）。
 *
 * 口径：TTL 只调 react-query staleTime/gcTime（数据新鲜度），持久化白名单
 * 沿用 persist.ts EXCLUDED_PREFIXES 反向（目录类全公开数据，天然放行），不在本模块重复建表。
 *
 * 刻意不接线（批3 P3-2 审查补注）：recommend / buy-again / frequent-bundle /
 * product-search 类 hook 的 queryKey 同样落在 products/* 前缀，但刻意不走
 * CATALOG_TTL 目录档——推荐/搜索结果价格敏感且时效性强，保持短 TTL
 * （5min/60s），防「推荐位展示半小时前的旧价」。isCatalogQueryKey 也因此
 * 只做诊断/扩展点用途，不作为 TTL 档位的判定依据。
 */

/** 目录类查询 TTL 档位（ms） */
export const CATALOG_TTL = {
  /** 分类树：低频变更（运营手工调），断网价值最高 */
  categories: 24 * 60 * 60 * 1000,
  /** banner：营销内容，半天档 */
  banners: 12 * 60 * 60 * 1000,
  /** 商品列表（全量/分类/搜索首页）：30min，价格库存敏感度高于分类 */
  productList: 30 * 60 * 1000,
  /** 商品详情：10min（详情页有库存/仓库可用性联动，保守） */
  productDetail: 10 * 60 * 1000,
} as const;

/**
 * 目录类 queryKey 判定（第一段精确匹配）。
 * 用途：断网场景诊断/未来 persist 分层 TTL 扩展点；与 persist.ts 排除表无交集
 * （categories/banners/products/product 全是公开数据，persist 天然放行）。
 */
export function isCatalogQueryKey(queryKey: readonly unknown[]): boolean {
  const first = queryKey[0];
  return (
    first === 'categories' || first === 'banners' || first === 'products' || first === 'product'
  );
}
