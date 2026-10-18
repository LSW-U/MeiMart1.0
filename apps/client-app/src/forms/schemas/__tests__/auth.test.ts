/**
 * phoneSchema transform 归一化测试（登录 401 修复）
 * Why: 后端 user.phone 存 E.164 全串（findUnique 精确匹配），UI 前缀块纯视觉不进表单值，
 * 裸号提交必 401——schema 层统一补 +670，4 个 auth 页共用
 */
import { loginPasswordSchema, loginSmsSchema, registerSchema, resetPasswordSchema } from '../auth';

const PASSWORD = 'Abc12345';
const AGREED = { agreed: true };

describe('auth phoneSchema transform：E.164 归一化', () => {
  it('裸号 → 补 +670（修复主场景：用户只输数字）', () => {
    const r = loginPasswordSchema.safeParse({ phone: '77123456', password: PASSWORD, ...AGREED });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+67077123456');
  });

  it('已带 +670 → 保持原样（去空格）', () => {
    const r = loginPasswordSchema.safeParse({
      phone: '+670 77123456',
      password: PASSWORD,
      ...AGREED,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+67077123456');
  });

  it('670 无 + 号 → 补 +（正则 \+?670 已消费前缀，剩余位补全）', () => {
    const r = loginPasswordSchema.safeParse({
      phone: '67077123456',
      password: PASSWORD,
      ...AGREED,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+67067077123456');
  });

  it('0 前缀（本机拨号习惯）→ 换成 +670', () => {
    const r = loginPasswordSchema.safeParse({ phone: '077123456', password: PASSWORD, ...AGREED });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe('+67077123456');
  });

  it('非法格式（邮箱）仍拒绝，transform 不放行', () => {
    const r = loginPasswordSchema.safeParse({ phone: 'a@b.com', password: PASSWORD, ...AGREED });
    expect(r.success).toBe(false);
  });

  it('空串仍拒绝（min(1) 在 transform 前）', () => {
    const r = loginPasswordSchema.safeParse({ phone: '', password: PASSWORD, ...AGREED });
    expect(r.success).toBe(false);
  });

  it('register/reset/loginSms 同享归一化（4 页共用 phoneSchema）', () => {
    const sms = loginSmsSchema.safeParse({ phone: '77123456', code: '123456', ...AGREED });
    expect(sms.success && sms.data.phone).toBe('+67077123456');

    const reg = registerSchema.safeParse({
      phone: '77123456',
      code: '123456',
      password: PASSWORD,
      confirmPassword: PASSWORD,
      inviteCode: '',
      ...AGREED,
    });
    expect(reg.success && reg.data.phone).toBe('+67077123456');

    const reset = resetPasswordSchema.safeParse({
      phone: '77123456',
      code: '123456',
      password: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect(reset.success && reset.data.phone).toBe('+67077123456');
  });
});
