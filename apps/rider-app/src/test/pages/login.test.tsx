/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import LoginPage from '../../../app/(auth)/login';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';

/**
 * LoginPage 单测 —— A1：登录页表单治理与交互反馈。
 *
 * 覆盖拍板（A1 方案 §5 全 A）：
 *   §3.1/§5① 手写校验 + errors 对象（phone 必填+格式 / password 模式必填 / code 模式必填 / accepted 必勾）
 *   §3.2/§5② 协议未勾选 inline 红字（errors.terms）
 *   §3.3 验证码发送语义修正——ApiError→codeSendFailed / 非 ApiError→networkError + isSmsPending loading/disabled
 *   §5③ codeSent 成功降级 Toast（替代 ConfirmDialog 弹窗）
 *   §5④ phoneInvalid 号码格式错降级 Input.error inline（替代 ConfirmDialog 弹窗）
 *
 * 桩法与 withdraw/history.test.tsx 同源（web project + RN host 壳）：
 *   - useAuth：mock login/sendSmsCode/isLoginPending/isSmsPending（mockSmsState 切 pending/error/ok）
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - useUpdateRiderSettings：语言切换 mutateAsync 桩
 *   - showToast：mock 模块取 spy（断言调用参数而非渲染）
 *   - expo-router：页面测试不关心导航
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const showToastMock = showToast as jest.Mock;
const mockLogin = jest.fn();
const mockSendSmsCode = jest.fn();

// 'sms-ok' | 'sms-error-api' | 'sms-error-network' | 'sms-pending'
let mockSmsState = 'sms-ok';
let mockIsLoginPending = false;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
  useUpdateRiderSettings: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    mockLogin: jest.fn(),
    logout: jest.fn(),
    sendSmsCode: mockSendSmsCode,
    isLoginPending: mockIsLoginPending,
    isLogoutPending: false,
    isSmsPending: mockSmsState === 'sms-pending',
  }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<LoginPage />, { wrapper });
}

/** 取第 N 个 TextInput 的 onChangeText（host 壳经 __fnProps 透传函数 prop）。 */
function getInputChangeText(container: HTMLElement, index = 0): (v: string) => void {
  const inputs = container.querySelectorAll('[data-rn-host="TextInput"]');
  // as unknown as 原因：query selector 返回 Element，需取测试 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
  const input = inputs[index] as unknown as { __fnProps: { onChangeText: (v: string) => void } };
  return input.__fnProps.onChangeText;
}

/** 取第 N 个 TextInput 的 value prop。 */
function readInputValue(container: HTMLElement, index = 0): string {
  const inputs = container.querySelectorAll('[data-rn-host="TextInput"]');
  return inputs[index]?.getAttribute('data-prop-value') ?? '';
}

/** 切到短信登录 tab（默认密码登录）。 */
function switchToSmsMode(container: HTMLElement) {
  const tabs = container.querySelectorAll('[data-rn-host="Pressable"]');
  // 第二个 tab Pressable 是「短信登录」（accessibilityLabel=smsTab 文案）
  const smsTab = Array.from(tabs).find((el) =>
    (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '验证码登录',
  );
  fireEvent.click(smsTab!);
}

/** 取发送验证码按钮（sms 模式下 Input rightSlot 内的 Pressable）。
 *  初始态 label=「获取验证码」；倒计时启动后 label=「重新发送 (Ns)」。按文案前缀匹配。 */
function getSendCodeButton(container: HTMLElement): Element {
  const buttons = container.querySelectorAll('[data-rn-host="Pressable"]');
  const sendBtn = Array.from(buttons).find((el) => {
    const label = el.getAttribute('data-prop-accessibilitylabel') ?? '';
    return label === '获取验证码' || label.startsWith('重新发送');
  });
  return sendBtn!;
}

beforeEach(() => {
  showToastMock.mockClear();
  mockLogin.mockReset();
  mockSendSmsCode.mockReset();
  mockSmsState = 'sms-ok';
  mockIsLoginPending = false;
});

describe('空表单提交校验（A1 §3.1/§5① 手写校验拦截）', () => {
  it('空表单点登录 → 3 处 inline 红字（手机号+密码+协议），不调后端', () => {
    const { getByText, queryAllByText } = renderPage();

    fireEvent.click(getByText('登 录'));

    expect(getByText('请输入手机号')).toBeTruthy();
    expect(getByText('请输入密码')).toBeTruthy();
    expect(getByText('请先同意服务条款和隐私政策')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
    // 无 success/error toast（校验在前）
    expect(showToastMock).not.toHaveBeenCalled();
    // 协议红字用 alert role（a11y）
    expect(queryAllByText('请先同意服务条款和隐私政策').length).toBeGreaterThanOrEqual(1);
  });

  it('号码格式错 → inline「手机号格式不正确」（非弹窗）', () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container)('123');
    });
    fireEvent.click(getByText('登 录'));

    expect(getByText('手机号格式不正确')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('协议勾选拦截（A1 §3.2/§5② inline 红字）', () => {
  it('填齐字段但未勾协议 → 仅协议红字，不调后端', () => {
    const { container, getByText, queryByText } = renderPage();

    act(() => {
      getInputChangeText(container)('+67077001234');
      getInputChangeText(container, 1)('password1');
    });
    fireEvent.click(getByText('登 录'));

    expect(getByText('请先同意服务条款和隐私政策')).toBeTruthy();
    expect(queryByText('请输入手机号')).toBeNull();
    expect(queryByText('请输入密码')).toBeNull();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('勾选协议后提交 → 校验通过，调 login()', async () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container)('+67077001234');
      getInputChangeText(container, 1)('password1');
    });
    // 勾选协议：Switch onValueChange 直调（host 壳 __fnProps）
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    mockLogin.mockResolvedValueOnce({});
    fireEvent.click(getByText('登 录'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('+67077001234', 'password1', undefined);
    });
  });
});

describe('短信模式校验跟随（A1 §3.1 code 必填）', () => {
  it('切短信模式 + 空验证码 → inline「请输入验证码」（非「请输入密码」）', () => {
    const { container, getByText, queryByText } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    fireEvent.click(getByText('登 录'));

    expect(getByText('请输入验证码')).toBeTruthy();
    expect(queryByText('请输入密码')).toBeNull();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

describe('验证码发送语义修正（A1 §3.3 + §5③④）', () => {
  it('号码格式错点发送 → inline 红字（非弹窗「手机号无效」）', () => {
    const { container } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('123');
    });
    fireEvent.click(getSendCodeButton(container));

    expect(container.textContent ?? '').toContain('手机号格式不正确');
    expect(mockSendSmsCode).not.toHaveBeenCalled();
    // 不弹 ConfirmDialog 文案
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('发送成功 → Toast(codeSentToast, success) + 倒计时启动（非弹窗）', async () => {
    mockSendSmsCode.mockResolvedValueOnce({});
    const { container } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('验证码已发送至 +67077001234', 'success');
    });
    // 倒计时启动：发送按钮 accessibilityLabel 变为「重新发送 (60s)」
    // Why: handleSendCode 内 startCountdown 同步 setCountdown(60)，但属异步函数内的状态更新，
    // 需 await waitFor 触发重渲染后 label 才切到 resend 文案。
    await waitFor(() => {
      expect(getSendCodeButton(container).getAttribute('data-prop-accessibilitylabel')).toContain('重新发送');
    });
    // sendCode 已被调用
    expect(mockSendSmsCode).toHaveBeenCalledWith('+67077001234');
  });

  it('发送失败 ApiError → Toast(codeSendFailed, error)（非「手机号无效」）', async () => {
    mockSendSmsCode.mockRejectedValueOnce(new ApiError(400, 'INVALID_PHONE', 'bad'));
    const { container } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('验证码发送失败', 'error');
    });
  });

  it('发送失败 网络异常（非 ApiError）→ Toast(networkError, error)', async () => {
    mockSendSmsCode.mockRejectedValueOnce(new Error('network'));
    const { container } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
    });
  });

  it('发送中 → 按钮 busy + ActivityIndicator（isSmsPending 消费）', () => {
    mockSmsState = 'sms-pending';
    const { container } = renderPage();

    switchToSmsMode(container);
    const sendBtn = getSendCodeButton(container);
    // Why: mock 壳 Pressable 解构出 disabled 时不挂 onClick（真 RN 行为），但 disabled 是
    // 受控状态字段；此处 sendCodeDisabled=countdown>0||isSmsPending 在初始渲染即 true，
    // 不过 host 壳的 data-prop-disabled 只在 Button/Pressable 显式受控时落 attr——
    // 故断言以 a11y busy state + ActivityIndicator 渲染为准（isSmsPending 真正被消费的证据）。
    // busy a11y state
    expect(sendBtn.getAttribute('data-prop-accessibilitystate')).toContain('"busy":true');
    // ActivityIndicator 渲染（loading 态替文案）
    expect(container.querySelector('[data-rn-host="ActivityIndicator"]')).not.toBeNull();
  });

  it('倒计时中再点发送 → 被拦截（不重复调 sendSmsCode）', async () => {
    mockSendSmsCode.mockResolvedValueOnce({});
    const { container } = renderPage();

    switchToSmsMode(container);
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    fireEvent.click(getSendCodeButton(container));
    await waitFor(() => {
      expect(mockSendSmsCode).toHaveBeenCalledTimes(1);
    });
    // Why: 首次发送成功后 startCountdown 同步 setCountdown(60)，需等重渲染后 label 切到
    // resend 才能确认倒计时已启动（countdown>0 是 handleSendCode 入口拦截条件）。
    await waitFor(() => {
      expect(getSendCodeButton(container).getAttribute('data-prop-accessibilitylabel')).toContain('重新发送');
    });

    // 倒计时已启动，再点（host 壳 countdown>0 时 disabled 不挂 onClick，即便挂也被入口拦截）
    fireEvent.click(getSendCodeButton(container));
    expect(mockSendSmsCode).toHaveBeenCalledTimes(1);
  });
});

describe('弹窗降级（A1 §5③④ ConfirmDialog 收口）', () => {
  it('phoneInvalid/codeSent 弹窗已移除：无「手机号无效」「验证码已发送」弹窗标题', () => {
    const { queryByText } = renderPage();
    // ConfirmDialog featureInProgress 保留（忘记密码弹窗），phoneInvalid/codeSent 已删
    expect(queryByText('手机号无效')).toBeNull();
    expect(queryByText('验证码已发送')).toBeNull();
  });

  it('忘记密码 → 仍弹 featureInProgress ConfirmDialog（保留）', () => {
    const { getByText, queryByText } = renderPage();
    fireEvent.click(getByText('忘记密码？'));
    // 弹窗「即将上线」标题出现
    expect(queryByText('即将上线')).toBeTruthy();
  });
});

describe('登录失败 toast（A1 回归：差异化 toast 不被校验破坏）', () => {
  it('登录后端拒绝 ApiError → Toast(login.failed, error)', async () => {
    mockLogin.mockRejectedValueOnce(new ApiError(401, 'BAD_CREDENTIALS', 'bad'));
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container)('+67077001234');
      getInputChangeText(container, 1)('password1');
    });
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    fireEvent.click(getByText('登 录'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('登录失败，请稍后重试', 'error');
    });
  });
});

// readInputValue 当前未在断言中使用，保留供后续字段回读场景；void 抑制未用警告会违反
// 代码异味规则，故以 export 形式占位避免 lint unused——但测试文件不宜 export。
// 改为在最小断言里消费一次，确保引用不沦为死代码。
describe('字段回读（host 壳 value 透传）', () => {
  it('输入手机号后 value prop 同步', () => {
    const { container } = renderPage();
    act(() => {
      getInputChangeText(container)('+67077001234');
    });
    expect(readInputValue(container)).toBe('+67077001234');
  });
});
