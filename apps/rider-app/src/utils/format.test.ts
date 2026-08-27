import { formatCurrency, formatDistance } from './format';
import { pickupDistance } from './distance';

/**
 * B6 格式化收口纯函数单测（rn project / node 环境，无需 jsdom/RN 壳）。
 * 方案 §4.5：pickupDistance 边界为核心，formatCurrency 补 decimals/sign。
 */

describe('pickupDistance', () => {
  it('下限保护：km=0 → 0.5', () => {
    expect(pickupDistance(0)).toBe(0.5);
  });

  it('边界：km=1.3 → 0.5（恰好抵消）', () => {
    expect(pickupDistance(1.3)).toBe(0.5);
  });

  it('正常偏移：km=2 → 0.7', () => {
    expect(pickupDistance(2)).toBe(0.7);
  });

  it('正常偏移：km=5 → 3.7', () => {
    expect(pickupDistance(5)).toBe(3.7);
  });

  // 距离计费批次1 #5 收尾（2026-08-27）：参数放宽 number|undefined，undefined → 隐藏
  it('km=undefined → undefined（历史订单无坐标降级）', () => {
    expect(pickupDistance(undefined)).toBeUndefined();
  });
});

describe('formatCurrency', () => {
  it('默认 2 位小数', () => {
    expect(formatCurrency(8, '¥')).toBe('¥8.00');
  });

  it('decimals:0 整数展示（tasks 运费场景）', () => {
    expect(formatCurrency(8, '¥', { decimals: 0 })).toBe('¥8');
  });

  it('decimals:1 保留 1 位（tasks 非整数运费场景）', () => {
    expect(formatCurrency(8.5, '¥', { decimals: 1 })).toBe('¥8.5');
  });

  it('sign:true 正值带 +（earnings 收支场景）', () => {
    expect(formatCurrency(8.5, '¥', { sign: true })).toBe('+¥8.50');
  });

  it('sign:true 负值带 -（earnings 支出场景）', () => {
    expect(formatCurrency(-3, '¥', { sign: true })).toBe('-¥3.00');
  });

  it('en 货币 $（locale 无关，符号由调用方传）', () => {
    expect(formatCurrency(12.5, '$')).toBe('$12.50');
  });
});

describe('formatDistance', () => {
  it('输出无空格 km', () => {
    expect(formatDistance(3.56)).toBe('3.6km');
  });

  it('保留 1 位小数', () => {
    expect(formatDistance(2.34)).toBe('2.3km');
  });

  // 距离计费批次1 #5 收尾（2026-08-27）：参数放宽 number|undefined，undefined → 隐藏
  it('undefined → undefined（调用方隐藏距离标签，不渲染 NaNkm）', () => {
    expect(formatDistance(undefined)).toBeUndefined();
  });
});
