/**
 * CaptchaInput 测试（批A2-2）
 *
 * 关键路径：渲染（SVG/加载态）+ 输入 4 位向上交付 + 刷新交互（票据换新、输入清空）
 * useFetchCaptcha mock（mutation hooks 先例），onChange 用 spy 取证
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CaptchaInput } from './CaptchaInput';

const mockMutate = jest.fn();

// Why: mock 返回对象必须引用稳定（生产 useMutation().mutate 引用恒定）——
// 内联箭头每次渲染新引用会让 refresh/effect 连锁重跑，扭曲被测行为。
// mutate 直接挂 mockMutate（组件调用形态 mutateFetch(undefined, opts)）
const mockUseFetchCaptcha = {
  mutate: mockMutate,
  isPending: false,
};

jest.mock('@/services/queries/useAuth', () => ({
  useFetchCaptcha: () => mockUseFetchCaptcha,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const SVG_A = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="120" height="44"/></svg>';
const SVG_B = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';

function resolveCaptcha(captchaId: string, svg: string) {
  // 组件调用形态 mutateFetch(undefined, { onSuccess, onError })：取末次调用第二参
  const opts = mockMutate.mock.calls.at(-1)![1] as {
    onSuccess?: (r: { captchaId: string; svg: string; expireIn: number }) => void;
    onError?: (e: unknown) => void;
  };
  opts.onSuccess?.({ captchaId, svg, expireIn: 60 });
}

describe('CaptchaInput', () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it('渲染：挂载即拉验证码，成功后展示 SVG 图', async () => {
    const { getByTestId } = render(<CaptchaInput onChange={jest.fn()} />, {
      wrapper: ThemeProvider,
    });
    expect(mockMutate).toHaveBeenCalledTimes(1);
    resolveCaptcha('cap-1', SVG_A);
    await waitFor(() => {
      // 方案A: accessibilityElementsHidden 挂外层容器后子树对 RNTL 查询隐藏（读屏同语义），
      // 查容器内节点须 includeHiddenElements
      expect(getByTestId('captcha-input-image', { includeHiddenElements: true })).toBeTruthy();
    });
  });

  it('输入 4 位且票据在期：onChange 交付 {captchaId, captchaText}；不足 4 位交付 null', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CaptchaInput onChange={onChange} />, {
      wrapper: ThemeProvider,
    });
    resolveCaptcha('cap-2', SVG_A);
    const field = getByTestId('captcha-input-field');

    fireEvent.changeText(field, 'ab');
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.changeText(field, 'ab1x');
    expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-2', captchaText: 'ab1x' });
  });

  it('拉取失败：onChange(null)（父层禁发），展示失败态', async () => {
    const onChange = jest.fn();
    const { getByText } = render(<CaptchaInput onChange={onChange} />, { wrapper: ThemeProvider });
    const opts = mockMutate.mock.calls.at(-1)![1] as { onError?: (e: unknown) => void };
    opts.onError?.(new Error('network'));
    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(null);
      // 方案A: 失败态 Text 在 accessibilityElementsHidden 容器内，查询须 includeHiddenElements
      expect(getByText('errors.generic', { includeHiddenElements: true })).toBeTruthy();
    });
  });

  it('点刷新：重新拉取并清空已输文本，新票据生效', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CaptchaInput onChange={onChange} />, {
      wrapper: ThemeProvider,
    });
    resolveCaptcha('cap-old', SVG_A);
    const field = getByTestId('captcha-input-field');
    fireEvent.changeText(field, 'ab1x');

    const callsBeforeRefresh = mockMutate.mock.calls.length;
    fireEvent.press(getByTestId('captcha-input-refresh'));
    // Why: 挂载 effect 在测试环境下可能多次触发，断言「刷新后新增拉取」而非精确次数
    expect(mockMutate.mock.calls.length).toBeGreaterThan(callsBeforeRefresh);
    resolveCaptcha('cap-new', SVG_B);
    await waitFor(() => {
      expect(getByTestId('captcha-input-image', { includeHiddenElements: true })).toBeTruthy();
    });
    // 旧输入已清空；重输后携带新票据
    fireEvent.changeText(field, 'xy9z');
    expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-new', captchaText: 'xy9z' });
  });

  // P2-1: 刷新瞬间必须作废父层已持有的旧票据——否则输满→刷新→不重输直接发码会提交已焚票据吃 400
  it('刷新瞬间：onChange(null) 作废父层旧票据（未重输时父层 payload 为 null）', async () => {
    const onChange = jest.fn();
    const { getByTestId } = render(<CaptchaInput onChange={onChange} />, {
      wrapper: ThemeProvider,
    });
    resolveCaptcha('cap-old', SVG_A);
    await waitFor(() => {
      // 票据 captchaId 已进组件 state（异步 onSuccess 后）
      const field = getByTestId('captcha-input-field');
      fireEvent.changeText(field, 'ab1x');
      expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-old', captchaText: 'ab1x' });
    });

    fireEvent.press(getByTestId('captcha-input-refresh'));
    // 刷新起点即清父层（票据已焚语义），此后不重输则父层 payload 恒 null
    expect(onChange).toHaveBeenLastCalledWith(null);

    // 不重输、等新图到达后父层仍是 null（fail-closed）
    resolveCaptcha('cap-new', SVG_B);
    await waitFor(() => {
      expect(getByTestId('captcha-input-image', { includeHiddenElements: true })).toBeTruthy();
    });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  // P3-1: 签发 expireIn 到期后 expired 生效——已输满的交付被撤回（null），提示切到期文案
  it('票据到期（expireIn）：已交付 payload 撤回为 null，提示切「已过期」', async () => {
    jest.useFakeTimers();
    try {
      const onChange = jest.fn();
      const { getByTestId, getByText } = render(<CaptchaInput onChange={onChange} />, {
        wrapper: ThemeProvider,
      });
      resolveCaptcha('cap-exp', SVG_A);
      await waitFor(() => {
        // 票据 captchaId 已进组件 state（异步 onSuccess 后）
        const field = getByTestId('captcha-input-field');
        fireEvent.changeText(field, 'ab1x');
        expect(onChange).toHaveBeenLastCalledWith({ captchaId: 'cap-exp', captchaText: 'ab1x' });
      });

      // expireIn=60s 后定时器置 expired
      act(() => {
        jest.advanceTimersByTime(60_000);
      });
      // 到期即撤回父层 payload（fail-closed）+ 提示切「已过期」
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(getByText('auth.captchaExpired')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
