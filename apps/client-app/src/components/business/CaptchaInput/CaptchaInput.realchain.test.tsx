/**
 * CaptchaInput 真实链路测试（B 部分 批4 假绿测试改造）
 *
 * 与 CaptchaInput.test.tsx 的区别：不 mock useFetchCaptcha 返回值，走真
 * useFetchCaptcha → authApi.fetchCaptcha → api.get('/common/auth/captcha')
 * （仅 axios 层 mock），验证 hook 链路 + expireIn 从后端响应透传（不写死 60）。
 * 独立文件原因：jest.mock 是文件级，真 hook 需要 QueryClientProvider，
 * 与旧文件的 hook mock 共存会击穿旧用例。
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme';
import { CaptchaInput } from './CaptchaInput';

const mockApiGet = jest.fn();
jest.mock('@/services/api', () => ({
  api: { get: (...a: unknown[]) => mockApiGet(...a), post: jest.fn() },
  isMockMode: false,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const SVG_A = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="120" height="44"/></svg>';

const qcWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ThemeProvider>{children}</ThemeProvider>
  </QueryClientProvider>
);

describe('CaptchaInput 真实链路（hook → authApi → axios 层）', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it('GET /common/auth/captcha 成功 → SVG 展示 + 输入后 onChange 交付票据（链路连通）', async () => {
    mockApiGet.mockResolvedValue({
      data: { captchaId: 'cap-real-1', svg: SVG_A, expireIn: 120 },
    });
    const onChange = jest.fn();
    const { getByTestId } = render(<CaptchaInput onChange={onChange} />, { wrapper: qcWrapper });
    await waitFor(() => {
      expect(getByTestId('captcha-input-image', { includeHiddenElements: true })).toBeTruthy();
    });
    expect(mockApiGet).toHaveBeenCalledWith('/common/auth/captcha');
    const field = getByTestId('captcha-input-field', { includeHiddenElements: true });
    fireEvent.changeText(field, '9z8y');
    expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-real-1', captchaText: '9z8y' });
  });

  // P3-5（批4 审查修复）：expireIn 非 60 值（120s）透传取证——fake timers 推进 120s
  // 过期置位、119s 不过期；固定 60s 实现会被「推进 61s 仍有效」拦截
  it('expireIn=120 透传：fake timers 推进 119s 未过期、120s 过期置位（非固定 60s）', async () => {
    jest.useFakeTimers();
    try {
      mockApiGet.mockResolvedValue({
        data: { captchaId: 'cap-real-120', svg: SVG_A, expireIn: 120 },
      });
      const onChange = jest.fn();
      const { getByTestId, queryByText } = render(<CaptchaInput onChange={onChange} />, {
        wrapper: qcWrapper,
      });
      await waitFor(() => {
        expect(getByTestId('captcha-input-field', { includeHiddenElements: true })).toBeTruthy();
      });
      // flush mutate onSuccess 的 setExpireIn（真实 timers 下先让 effect 挂上 setTimeout）
      await act(async () => {
        await Promise.resolve();
      });
      // t mock 返 key：未过期时 refresh 文案为 auth.captchaRefresh
      expect(queryByText('auth.captchaExpired')).toBeNull();

      // 推进 119s（119999ms，留 1ms 余量）：仍未过期
      act(() => {
        jest.advanceTimersByTime(119_999);
      });
      expect(queryByText('auth.captchaExpired')).toBeNull();

      // 再推进 1ms（累计 120s）：定时器按 expireIn*1000 触发过期
      act(() => {
        jest.advanceTimersByTime(1);
      });
      await act(async () => {
        await Promise.resolve();
      });
      expect(queryByText('auth.captchaExpired')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('接口失败 → 失败态渲染 + onChange(null)（父层禁发）', async () => {
    mockApiGet.mockRejectedValue(new Error('captcha down'));
    const onChange = jest.fn();
    const { getByTestId } = render(<CaptchaInput onChange={onChange} />, { wrapper: qcWrapper });
    await waitFor(() => {
      expect(getByTestId('captcha-input-refresh', { includeHiddenElements: true })).toBeTruthy();
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
