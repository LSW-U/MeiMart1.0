import { redactError } from '../../utils/redact';

/**
 * D11 批4（R-P1-10）：日志脱敏单测——凭证/请求体不入日志摘要。
 */
describe('redactError', () => {
  it('普通 Error：name + message', () => {
    expect(redactError(new Error('network down'))).toBe('Error network down');
  });

  it('ApiError 形态：附 code/status（安全面字段）', () => {
    const e = new Error('Request failed');
    Object.assign(e, { status: 401, code: 'AUTH' });
    expect(redactError(e)).toBe('Error Request failed code=AUTH status=401');
  });

  it('非 Error 值字符串化', () => {
    expect(redactError('plain string')).toBe('plain string');
    expect(redactError(42)).toBe('42');
  });

  it('空 message 不留悬挂空段', () => {
    expect(redactError(new Error(''))).toBe('Error');
  });
});
