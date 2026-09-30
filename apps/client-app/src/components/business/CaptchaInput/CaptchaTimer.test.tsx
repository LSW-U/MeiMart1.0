/**
 * C-P2-4: CaptchaInput 刷新后定时器按票据重置
 *
 * 回归场景（报告 §7 假绿 §7.4 相关）：刷新返回同 expireIn（60s）时，旧实现依赖仅 expireIn
 * 不触发 effect → 旧票据的计时继续 → 新票据刚签发就被误判过期（expired=true 撤回交付）。
 * 修复后依赖含 captchaId（每张票据唯一），刷新即拆旧建新计时。
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CaptchaInput } from './CaptchaInput';

const mockMutate = jest.fn();

const mockUseFetchCaptcha = { mutate: mockMutate, isPending: false };

jest.mock('@/services/queries/useAuth', () => ({
  useFetchCaptcha: () => mockUseFetchCaptcha,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';

function resolveCaptcha(captchaId: string, expireIn = 60) {
  const opts = mockMutate.mock.calls.at(-1)![1] as {
    onSuccess?: (r: { captchaId: string; svg: string; expireIn: number }) => void;
  };
  opts.onSuccess?.({ captchaId, svg: SVG, expireIn });
}

describe('C-P2-4 刷新后 expireIn 计时重置', () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it('同 expireIn 刷新新票据：新票据在完整 60s 内仍可交付（旧计时未残留）', () => {
    jest.useFakeTimers();
    try {
      const onChange = jest.fn();
      const { getByTestId } = render(<CaptchaInput onChange={onChange} />, {
        wrapper: ThemeProvider,
      });
      act(() => resolveCaptcha('cap-1', 60));
      const field = getByTestId('captcha-input-field');
      fireEvent.changeText(field, 'ab1x');
      expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-1', captchaText: 'ab1x' });

      // 刷新（消费即焚 onChange(null)），新票据同 expireIn=60
      fireEvent.press(getByTestId('captcha-input-refresh'));
      act(() => resolveCaptcha('cap-2', 60));
      fireEvent.changeText(field, 'cd9z');
      expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-2', captchaText: 'cd9z' });

      // 关键回归断言：从「新票据签发」起 60s 内（旧计时本应在 ~30s 前触发误判）票据仍有效
      act(() => {
        jest.advanceTimersByTime(30_000);
      });
      expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-2', captchaText: 'cd9z' });

      // 新票据自己的 60s 到期 → 撤回（fail-closed 语义保留）
      act(() => {
        jest.advanceTimersByTime(30_001);
      });
      expect(onChange).toHaveBeenLastCalledWith(null);
    } finally {
      jest.useRealTimers();
    }
  });

  it('旧票据到期后刷新：expired 复位 + 新票据可交付', () => {
    jest.useFakeTimers();
    try {
      const onChange = jest.fn();
      const { getByTestId, getByText } = render(<CaptchaInput onChange={onChange} />, {
        wrapper: ThemeProvider,
      });
      act(() => resolveCaptcha('cap-old', 60));
      const field = getByTestId('captcha-input-field');
      fireEvent.changeText(field, 'ab1x');

      // 旧票据到期：撤回 + 提示已过期
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(getByText('auth.captchaExpired')).toBeTruthy();

      // 刷新换新票：expired 复位，新票据可正常交付
      fireEvent.press(getByTestId('captcha-input-refresh'));
      act(() => resolveCaptcha('cap-new', 60));
      fireEvent.changeText(field, 'xy9z');
      expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-new', captchaText: 'xy9z' });
      // 过期提示不再显示
      expect(getByText('auth.captchaLabel', { includeHiddenElements: true })).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
