import { safeDeepLink } from '../../utils/safe-deep-link';

/**
 * D8 批4（R-P3-8）：深链白名单单测——服务端/推送 link 不可信输入的分型。
 */
describe('safeDeepLink', () => {
  it('放行固定白名单路由', () => {
    expect(safeDeepLink('/(main)/earnings')).toBe('/(main)/earnings');
    expect(safeDeepLink('/(main)/tasks')).toBe('/(main)/tasks');
    expect(safeDeepLink('/notifications')).toBe('/notifications');
  });

  it('放行合法 orderId 深链', () => {
    expect(safeDeepLink('/order/10239485')).toBe('/order/10239485');
    expect(safeDeepLink('/order/abc-DEF-123')).toBe('/order/abc-DEF-123');
  });

  it('拒绝路径穿越/编码注入/特殊字符', () => {
    expect(safeDeepLink('/order/../settings')).toBeNull();
    expect(safeDeepLink('/order/%6A%44')).toBeNull();
    expect(safeDeepLink('/order/abc_123')).toBeNull(); // 下划线不在白名单
    expect(safeDeepLink('/order/')).toBeNull();
  });

  it('拒绝超长 id（>40）与未知路由', () => {
    expect(safeDeepLink(`/order/${'a'.repeat(41)}`)).toBeNull();
    expect(safeDeepLink('/unknown/route')).toBeNull();
    expect(safeDeepLink('javascript:alert(1)')).toBeNull();
    expect(safeDeepLink('')).toBeNull();
  });
});
