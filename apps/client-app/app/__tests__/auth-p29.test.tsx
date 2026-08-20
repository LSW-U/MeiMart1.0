/**
 * P29 auth 4 页渲染测试（规则 8）
 *
 * login：phone 字段（D4）+ +670 前缀（D10）+ visibility 图标（D11）+ CTA label
 * login-sms：验证码倒计时按钮 + sms 图标
 * register：密码强度条三态（D5，passwordStrength 纯函数 + UI 挂载）
 * reset-password：渲染 + 图标
 * mock useAuth mutation + authStore（不真发请求）
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { loginPasswordSchema, registerSchema } from '@/forms/schemas/auth';
// babel-jest 把 jest.mock hoist 到 import 之上，页面 import 放前面照样被 mock（about-p25 先例）
import RegisterPage, { passwordStrength } from '../(auth)/register';
import LoginPage from '../(auth)/login';
import LoginSmsPage from '../(auth)/login-sms';
import ResetPasswordPage from '../(auth)/reset-password';

const mockMutate = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/services/queries/useAuth', () => ({
  useLoginPassword: () => ({ mutate: mockMutate, isPending: false }),
  useLoginSms: () => ({ mutate: mockMutate, isPending: false }),
  useRegister: () => ({ mutate: mockMutate, isPending: false }),
  useSendSmsCode: () => ({ mutate: mockMutate, isPending: false }),
  useResetPassword: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { setAuth: () => void }) => unknown) =>
    selector({ setAuth: jest.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('P29-D4 login：phone-only schema', () => {
  it('loginPasswordSchema 字段是 phone（account 已删，D4）', () => {
    const ok = loginPasswordSchema.safeParse({
      phone: '+67077123456',
      password: 'Abc12345',
      agreed: true,
    });
    expect(ok.success).toBe(true);
    // 邮箱输入不再通过（原 emailOrPhoneSchema 已删）
    const email = loginPasswordSchema.safeParse({
      phone: 'a@b.com',
      password: 'Abc12345',
      agreed: true,
    });
    expect(email.success).toBe(false);
  });

  it('渲染：phone 字段 label + +670 前缀 + CTA label', () => {
    const { getByText } = render(<LoginPage />, { wrapper });
    expect(getByText('auth.phoneNumber')).toBeTruthy();
    expect(getByText('+670')).toBeTruthy();
    expect(getByText('auth.signIn')).toBeTruthy();
    expect(getByText('auth.welcomeBack')).toBeTruthy();
  });

  it('AuthShell 紧凑品牌区：MeiMart 品牌标识渲染（D2）', () => {
    const { getByText, queryByText } = render(<LoginPage />, { wrapper });
    expect(getByText('MeiMart')).toBeTruthy();
    // 文化锚点区已删
    expect(queryByText('Loke Odamatan')).toBeNull();
  });
});

describe('P29 login-sms / reset-password', () => {
  it('login-sms 渲染：验证码行 + 发送按钮 + 短信登录副文案', () => {
    const { getByText, getByTestId } = render(<LoginSmsPage />, { wrapper });
    expect(getByText('auth.verificationCode')).toBeTruthy();
    expect(getByText('auth.sendCodeBtn')).toBeTruthy();
    expect(getByText('+670')).toBeTruthy();
    expect(getByTestId('login-sms-send')).toBeTruthy();
  });

  it('reset-password 渲染：新密码 + 确认密码 label', () => {
    const { getByText } = render(<ResetPasswordPage />, { wrapper });
    expect(getByText('auth.newPasswordLabel')).toBeTruthy();
    expect(getByText('auth.confirmPasswordLabel')).toBeTruthy();
    expect(getByText('+670')).toBeTruthy();
  });
});

describe('P29-D5 register：密码强度条', () => {
  it('passwordStrength 纯函数三态：弱/中/强', () => {
    expect(passwordStrength('')).toBe(1);
    expect(passwordStrength('12345678')).toBe(1); // 纯数字
    expect(passwordStrength('abcdefgh')).toBe(1); // 纯字母（<8 也弱）
    expect(passwordStrength('Abc12345')).toBe(2); // 字母+数字无特殊字符
    expect(passwordStrength('Abc12345!')).toBe(3); // 含特殊字符
  });

  it('register 渲染：确认密码 + 前缀；输密码后强度条出现（D5）', async () => {
    const { getByTestId, getByText, queryByTestId } = render(<RegisterPage />, { wrapper });
    expect(getByText('auth.confirmPasswordLabel')).toBeTruthy();
    expect(getByText('+670')).toBeTruthy();
    expect(getByText('auth.registerAction')).toBeTruthy();
    // 初始密码为空：强度条不渲染
    expect(queryByTestId('register-pwd-strength')).toBeNull();
    // 输入密码 → 强度条出现（useWatch 订阅，RHF 状态更新异步）
    fireEvent.changeText(getByTestId('register-password'), 'Abc12345');
    await waitFor(() => {
      expect(getByTestId('register-pwd-strength')).toBeTruthy();
    });
    // 中档（Abc12345 无特殊字符）→ hint 行含 pwdMedium/pwdHintMedium（拼接 Text 用正则匹配）
    await waitFor(() => {
      expect(getByText(/auth\.pwdMedium/)).toBeTruthy();
      expect(getByText(/auth\.pwdHintMedium/)).toBeTruthy();
    });
  });

  it('registerSchema 密码强度中档可用（8+ 字母数字）', () => {
    const ok = registerSchema.safeParse({
      phone: '+67077123456',
      code: '123456',
      password: 'Abc12345',
      confirmPassword: 'Abc12345',
      inviteCode: '',
      agreed: true,
    });
    expect(ok.success).toBe(true);
  });
});
