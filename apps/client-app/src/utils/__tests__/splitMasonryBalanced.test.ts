import {
  splitMasonryBalanced,
  masonryImageHeight,
  MASONRY_IMAGE_HEIGHTS,
} from '../splitMasonryBalanced';

// Why: 档位表与 MasonryProductCard 渲染高度同源（charCode 选档），测试锁定契约——
//   改卡片 HEIGHT_VARIANTS 不同步改这里，分列均衡失效（底部重新一长一短）
describe('masonryImageHeight', () => {
  it('returns one of the 3 fixed height variants, keyed by id charCode', () => {
    expect(MASONRY_IMAGE_HEIGHTS).toEqual([140, 168, 120]);
    expect(masonryImageHeight('a1')).toBe(168); // 'a'.charCodeAt(0)=97 % 3 = 1
    expect(masonryImageHeight('b1')).toBe(120); // 98 % 3 = 2
    expect(masonryImageHeight('c1')).toBe(140); // 99 % 3 = 0
  });
});

describe('splitMasonryBalanced', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}${i}`);

  it('keeps relative order within each column', () => {
    const pool = ids(6);
    const [c1, c2] = splitMasonryBalanced(pool.map((id) => ({ id })));
    // 两列各自内部顺序与原列表相对顺序一致（列内下标递增）
    for (const col of [c1, c2]) {
      const idxs = col.map((it) => pool.indexOf(it.id));
      expect(idxs).toEqual([...idxs].sort((a, b) => a - b));
    }
  });

  it('balances cumulative estimated height: column diff < one item height', () => {
    // 70 条（首页推荐池量级）随机 id——奇偶分列无法保证，均衡分列必须保证
    const items = ids(70).map((id) => ({ id }));
    const [c1, c2] = splitMasonryBalanced(items);
    const sum = (col: { id: string }[]) =>
      col.reduce((acc, it) => acc + masonryImageHeight(it.id) + 92, 0);
    const diff = Math.abs(sum(c1) - sum(c2));
    // 差值必须小于单张最高卡片（168 + 92）
    expect(diff).toBeLessThan(260);
  });

  it('equal heights: first goes left, second goes right (shorter column wins)', () => {
    // 两个同档高 id（'a1'/'d1' charCode 97/100 均 %3=1 → 同 168 档）：
    // 首张进左列后左列变高，次张必须去更矮的右列——正是均衡语义
    const [c1, c2] = splitMasonryBalanced([{ id: 'a1' }, { id: 'd1' }]);
    expect(masonryImageHeight('a1')).toBe(masonryImageHeight('d1'));
    expect(c1.map((i) => i.id)).toEqual(['a1']);
    expect(c2.map((i) => i.id)).toEqual(['d1']);
  });

  it('handles empty input', () => {
    expect(splitMasonryBalanced([])).toEqual([[], []]);
  });

  it('every item lands in exactly one column', () => {
    const items = ids(70);
    const [c1, c2] = splitMasonryBalanced(items.map((id) => ({ id })));
    expect(c1.length + c2.length).toBe(70);
  });
});
