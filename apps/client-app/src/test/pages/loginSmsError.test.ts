/**
 * toApiErrorText 错误码映射单测（批A2-3 P1-1）
 *
 * 后端全局异常信封 response.data.error.{code,message}（all-exceptions.filter.ts:86-92），
 * 用真实信封形状锁「信封位主读 + 顶层 data.code 兼容 + 429 兜底 + 回退」四条路径
 */
import { toApiErrorText } from '@/utils/apiError';

const t = (key: string) =>
  ({
    'errors.E-SMS-001': '验证码服务暂不可用，请稍后再试',
    'errors.E-RATELIMIT-001': '操作过于频繁，请稍后再试',
    'errors.E-CAPTCHA-001': '图形验证码错误，请重试',
    'errors.network': '网络异常，请检查连接',
  })[key] ?? key;

describe('toApiErrorText（P1-1 真实信封形状）', () => {
  it('信封位 data.error.code 命中 → 四语文案（后端真实形状 {success:false,error:{code}}）', () => {
    const error = {
      response: {
        status: 503,
        data: { success: false, error: { code: 'E-SMS-001', message: 'provider down' } },
      },
    };
    expect(toApiErrorText(error, t)).toBe('验证码服务暂不可用，请稍后再试');
  });

  it('顶层 data.code 兼容路径仍生效（防御旧形状）', () => {
    const error = {
      response: { status: 400, data: { code: 'E-CAPTCHA-001' } },
    };
    expect(toApiErrorText(error, t)).toBe('图形验证码错误，请重试');
  });

  it('信封 code 缺 errors key → 回退 fallback；status 429 无 code → 操作频繁', () => {
    // 缺 key：t() 原样返回 key 本身 → 走 fallback
    expect(
      toApiErrorText(
        { response: { status: 410, data: { error: { code: 'E-UNKNOWN-999' } } } },
        t,
        '短信登录失败',
      ),
    ).toBe('短信登录失败');
    // 429 无 code（网关剥 body）→ E-RATELIMIT-001 文案
    expect(toApiErrorText({ response: { status: 429, data: {} } }, t)).toBe(
      '操作过于频繁，请稍后再试',
    );
  });

  it('非 axios 形状（普通 Error / null）→ 回退 errors.network', () => {
    expect(toApiErrorText(new Error('boom'), t)).toBe('网络异常，请检查连接');
    expect(toApiErrorText(null, t)).toBe('网络异常，请检查连接');
  });
});
