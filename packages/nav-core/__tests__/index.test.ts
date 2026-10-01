/** safeRoutePush 单测（批3 A6）：白名单放行 + 非法 id 降级不报错 */
import { SAFE_ID_PATTERN, safeRoutePush } from '../src';

describe('SAFE_ID_PATTERN', () => {
  it.each(['abc123', 'o-9X_忽视连字符', 'a'])('放行 %s', (id) => {
    // 注：下划线不在白名单（rider 现值 ^[A-Za-z0-9-]{1,40}$ 原样上收）
    expect(SAFE_ID_PATTERN.test(id.replace('_忽视连字符', '-ok'))).toBe(true);
  });

  it('拒绝路径穿越/编码/超长/空串', () => {
    expect(SAFE_ID_PATTERN.test('../../etc')).toBe(false);
    expect(SAFE_ID_PATTERN.test('a%2Fb')).toBe(false);
    expect(SAFE_ID_PATTERN.test('a'.repeat(41))).toBe(false);
    expect(SAFE_ID_PATTERN.test('')).toBe(false);
    expect(SAFE_ID_PATTERN.test('a_b')).toBe(false);
    expect(SAFE_ID_PATTERN.test('a b')).toBe(false);
  });
});

describe('safeRoutePush', () => {
  it('合法 id → push basePath/id', () => {
    const push = jest.fn();
    safeRoutePush(push, '/order', 'ord-123');
    expect(push).toHaveBeenCalledWith('/order/ord-123');
  });

  it('非法 id（路径穿越）→ 降级不 push 不抛错', () => {
    const push = jest.fn();
    expect(() => safeRoutePush(push, '/order', '../../admin')).not.toThrow();
    expect(push).not.toHaveBeenCalled();
  });

  it('非法 id（% 编码 / 超长 / 空串 / 非 string / null）→ 全部降级', () => {
    const push = jest.fn();
    for (const bad of ['a%2Fb', 'x'.repeat(41), '', 123, null, undefined, {}]) {
      expect(() => safeRoutePush(push, '/product', bad)).not.toThrow();
    }
    expect(push).not.toHaveBeenCalled();
  });

  it('边界：40 位合法 id 放行', () => {
    const push = jest.fn();
    safeRoutePush(push, '/order', 'a'.repeat(40));
    expect(push).toHaveBeenCalledTimes(1);
  });
});
