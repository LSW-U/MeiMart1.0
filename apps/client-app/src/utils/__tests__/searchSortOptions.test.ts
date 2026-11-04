/**
 * P3-3（20261105 拍板补测）：priceDesc 回退开关 disabled 分支此前零覆盖——
 *   PRICE_DESC_ENABLED=true 时首跑的是 enabled 分支，回退（false）路径只在后端回滚时
 *   才首次执行。抽 buildSortOptions 纯函数直接断言两态，防回退。
 */
import { buildSortOptions } from '../searchSortOptions';

describe('buildSortOptions — priceDesc 回退开关（P3-3）', () => {
  it('enabled=true：priceDesc 档位放开（disabled=false）', () => {
    const opts = buildSortOptions(true);
    const priceDesc = opts.find((o) => o.key === 'priceDesc');
    expect(priceDesc?.disabled).toBe(false);
    // 其余 4 档不受开关影响
    expect(opts).toHaveLength(5);
    expect(opts.filter((o) => o.key !== 'priceDesc' && o.disabled).length).toBe(0);
  });

  it('enabled=false（后端回滚）：仅 priceDesc 置灰，其余档位可用', () => {
    const opts = buildSortOptions(false);
    expect(opts.find((o) => o.key === 'priceDesc')?.disabled).toBe(true);
    expect(opts.filter((o) => o.key !== 'priceDesc' && o.disabled).length).toBe(0);
  });
});
