import { formatCurrency, formatDistance } from './format';

/**
 * B6 格式化收口纯函数单测（rn project / node 环境，无需 jsdom/RN 壳）。
 * D3 批4：pickupDistance 推算值已停用（tasks/detail/navigate 三处改诚实
 * 「全程 X km」文案，utils/distance.ts 整文件删除），本文件改测 formatDistance
 * 降级链（原 pickupDistance 用例的测试语义由调用方诚实文案承接）。
 */

describe('formatDistance', () => {
  it('正常值：5 → "5.0km"（toFixed(1) 一位小数）', () => {
    expect(formatDistance(5)).toBe('5.0km');
  });

  it('小数：3.7 → "3.7km"', () => {
    expect(formatDistance(3.7)).toBe('3.7km');
  });

  it('undefined → undefined（历史订单无坐标，调用方隐藏标签）', () => {
    expect(formatDistance(undefined)).toBeUndefined();
  });

  it('0 → "0.0km"（0 是合法值非缺失）', () => {
    expect(formatDistance(0)).toBe('0.0km');
  });
});

describe('formatCurrency（回归哨兵：distance 收口后确保未破坏）', () => {
  it('整数分转美元无小数', () => {
    expect(formatCurrency(12.5, '$', { decimals: 0 })).toBe('$13');
  });

  it('一位小数', () => {
    expect(formatCurrency(12.34, '$', { decimals: 1 })).toBe('$12.3');
  });
});
