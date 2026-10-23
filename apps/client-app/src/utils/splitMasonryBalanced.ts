/**
 * 伪瀑布流两列均衡分列：按累计预估高度把商品依次放进「当前更矮的列」。
 *
 * Why: 原三处消费方（home/search results/favorites）都用 `i % 2` 奇偶分列——
 *   卡片高度按 id charCode 选 3 档（140/168/120），两列累计高度纯随机，
 *   加载到底后一列明显更长，另一列底部空出一截（用户 20261023 实测「左边多右边少」）。
 *   改为读 MasonryProductCard 同款高度档位估算（图片档高 + 固定 info 区约 92px），
 *   新卡片放矮列 → 底部两列高度收敛到一张卡以内，错落感保留。
 *
 * 算法约束：与 MasonryProductCard 的 HEIGHT_VARIANTS / charCode 选档保持同一实现
 *   事实（档位表与 idx 公式），故单测断言即锁定卡片视觉高度——改档位表会同时
 *   影响两处，测试会先红。预估用「图片档高 + info 区常量」，不求像素级精确
 *   （名称行数差 ±~16px 在允许带内），只要两列累计差 < 单卡高即可对齐底部。
 */

export const MASONRY_IMAGE_HEIGHTS = [140, 168, 120] as const;
// info 区（padding sm×2 + 名称 minHeight 32 + 价格行 ~32 + gap）近似常量
const INFO_ESTIMATE = 92;

/** 与 MasonryProductCard 渲染同源：按 id charCode 选图片高度档位 */
export function masonryImageHeight(id: string): number {
  return MASONRY_IMAGE_HEIGHTS[id.charCodeAt(0) % MASONRY_IMAGE_HEIGHTS.length];
}

export function masonryItemEstimatedHeight(id: string): number {
  return masonryImageHeight(id) + INFO_ESTIMATE;
}

/**
 * 顺序遍历 items，每项放入累计预估高度更小的列（等高则进左列）。
 * 返回 [左列, 右列]，各自保持原有相对顺序。
 */
export function splitMasonryBalanced<T extends { id: string }>(items: T[]): [T[], T[]] {
  const col1: T[] = [];
  const col2: T[] = [];
  let h1 = 0;
  let h2 = 0;
  for (const item of items) {
    const h = masonryItemEstimatedHeight(item.id);
    if (h1 <= h2) {
      col1.push(item);
      h1 += h;
    } else {
      col2.push(item);
      h2 += h;
    }
  }
  return [col1, col2];
}
