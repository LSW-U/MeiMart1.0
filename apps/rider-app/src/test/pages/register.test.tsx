/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import RegisterPage from '../../../app/(auth)/register';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';

/**
 * RegisterPage 单测 —— A2：注册页表单治理与死字段清理。
 *
 * 覆盖拍板（A2 方案 §6 全 A）：
 *   §6① 手写校验 + errors 对象（name 必填 / phone 必填+格式 / smsCode 必填[prod] / idCardNumber 必填+min6 / accepted 必勾）
 *   §6② 协议未勾选 inline 红字（errors.terms）
 *   §6④ 验证码发送失败语义——ApiError→codeSendFailed / 非 ApiError→networkError + isSmsPending loading/disabled
 *   §6⑤ vehicleType 三选一 SegmentedControl（套用 history 范式，selected 态切换）
 *   §6⑥ 假上传保留现状（不死字段删除回归：homeAddress/security 分组、底部 error 红框块已移除）
 *
 * 桩法与 login.test.tsx 同源（web project + RN host 壳）：
 *   - useAuth：mock login/mockLogin/sendSmsCode/isSmsPending（mockSmsState 切 pending/error/ok）
 *   - useRiderSettings：language='zh' 走 zh 字典（useTranslation 内部依赖）
 *   - riderApi.apply：mockApply 控制成功/reject
 *   - showToast：mock 模块取 spy（断言调用参数而非渲染）
 *   - expo-router：页面测试不关心导航
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const showToastMock = showToast as jest.Mock;
const mockSendSmsCode = jest.fn();
const mockLogin = jest.fn();
const mockMockLogin = jest.fn();
const mockApply = jest.fn();
const mockRouterReplace = jest.fn();

// 'sms-ok' | 'sms-error-api' | 'sms-error-network' | 'sms-pending'
let mockSmsState = 'sms-ok';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace, back: jest.fn(), canGoBack: () => true }),
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
    mockLogin: mockMockLogin,
    logout: jest.fn(),
    sendSmsCode: mockSendSmsCode,
    isLoginPending: false,
    isLogoutPending: false,
    isSmsPending: mockSmsState === 'sms-pending',
  }),
}));

jest.mock('../../../src/services/user', () => ({
  riderApi: { apply: (...args: unknown[]) => mockApply(...args) },
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<RegisterPage />, { wrapper });
}

/** 取第 N 个 TextInput 的 onChangeText（host 壳经 __fnProps 透传函数 prop）。 */
function getInputChangeText(container: HTMLElement, index = 0): (v: string) => void {
  const inputs = container.querySelectorAll('[data-rn-host="TextInput"]');
  // as unknown as 原因：query selector 返回 Element，需取测试 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
  const input = inputs[index] as unknown as { __fnProps: { onChangeText: (v: string) => void } };
  return input.__fnProps.onChangeText;
}

/** 取发送验证码按钮（phone Input rightSlot 内的 Pressable）。
 *  初始态 label=「获取验证码」；倒计时启动后 label=「重新发送 (Ns)」。按文案前缀匹配。 */
function getSendCodeButton(container: HTMLElement): Element {
  const buttons = container.querySelectorAll('[data-rn-host="Pressable"]');
  const sendBtn = Array.from(buttons).find((el) => {
    const label = el.getAttribute('data-prop-accessibilitylabel') ?? '';
    return label === '获取验证码' || label.startsWith('重新发送');
  });
  return sendBtn!;
}

/** 取 vehicleType 三选一某项（accessibilityLabel=摩托车/自行车/汽车）。 */
function getVehicleOption(container: HTMLElement, label: string): Element {
  const buttons = container.querySelectorAll('[data-rn-host="Pressable"]');
  const btn = Array.from(buttons).find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === label);
  return btn!;
}

beforeEach(() => {
  showToastMock.mockClear();
  mockSendSmsCode.mockReset();
  mockLogin.mockReset();
  mockMockLogin.mockReset();
  mockApply.mockReset();
  mockRouterReplace.mockReset();
  mockSmsState = 'sms-ok';
  // DEV 流程：mockLogin('customer') → apply → mockLogin('rider') → replace
  mockMockLogin.mockResolvedValue({});
  mockApply.mockResolvedValue({});
});

describe('空表单提交校验（A2 §3.2/§6① 手写校验拦截）', () => {
  it('空表单点注册 → 多处 inline 红字（姓名+手机号+证件号+协议），不调后端', () => {
    const { getByText } = renderPage();

    fireEvent.click(getByText('注册成为骑手'));

    expect(getByText('请输入姓名')).toBeTruthy();
    expect(getByText('请输入手机号')).toBeTruthy();
    expect(getByText('请输入证件号')).toBeTruthy();
    expect(getByText('请先同意服务条款和隐私政策')).toBeTruthy();
    expect(mockMockLogin).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    // 无 toast（校验在前）
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('手机号格式错 → inline「手机号格式不正确」', () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('123');
    });
    fireEvent.click(getByText('注册成为骑手'));

    expect(getByText('手机号格式不正确')).toBeTruthy();
    expect(mockMockLogin).not.toHaveBeenCalled();
  });

  it('证件号 < 6 位 → inline「证件号至少 6 位」（§6③ A min6）', () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('12345');
    });
    fireEvent.click(getByText('注册成为骑手'));

    expect(getByText('证件号至少 6 位')).toBeTruthy();
    expect(mockMockLogin).not.toHaveBeenCalled();
  });
});

describe('协议勾选拦截（A2 §6② inline 红字）', () => {
  it('填齐字段但未勾协议 → 仅协议红字，不调后端', () => {
    const { container, getByText, queryByText } = renderPage();

    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('1234567');
    });
    fireEvent.click(getByText('注册成为骑手'));

    expect(getByText('请先同意服务条款和隐私政策')).toBeTruthy();
    expect(queryByText('请输入姓名')).toBeNull();
    expect(queryByText('请输入手机号')).toBeNull();
    expect(mockMockLogin).not.toHaveBeenCalled();
  });

  it('勾选协议后提交 → 校验通过，DEV 走 mockLogin+apply+mockLogin(rider)（§3.4 DEV 流程）', async () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('1234567');
    });
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    fireEvent.click(getByText('注册成为骑手'));

    await waitFor(() => {
      expect(mockMockLogin).toHaveBeenCalledWith('customer');
      expect(mockApply).toHaveBeenCalledWith({
        riderName: 'Adão Belo',
        phone: '+670 77001234',
        vehicleType: 'MOTORCYCLE',
        idCardNumber: '1234567',
      });
    });
    // Step 3：DEV 自动 rider 登录 + Step 4 跳转
    await waitFor(() => {
      expect(mockMockLogin).toHaveBeenCalledWith('rider');
      expect(mockRouterReplace).toHaveBeenCalledWith('/(main)/tasks');
    });
  });
});

describe('vehicleType 三选一（A2 §6⑤ SegmentedControl）', () => {
  it('切到「自行车」后提交 → apply 传 vehicleType=BICYCLE', async () => {
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('1234567');
    });
    fireEvent.click(getVehicleOption(container, '自行车'));
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    fireEvent.click(getByText('注册成为骑手'));

    await waitFor(() => {
      expect(mockApply).toHaveBeenCalledWith(
        expect.objectContaining({ vehicleType: 'BICYCLE' }),
      );
    });
  });

  it('选中项 accessibilityState.selected=true，未选中=false', () => {
    const { container } = renderPage();
    const moto = getVehicleOption(container, '摩托车');
    const bike = getVehicleOption(container, '自行车');
    // 默认 MOTORCYCLE 选中
    expect(moto.getAttribute('data-prop-accessibilitystate')).toContain('"selected":true');
    expect(bike.getAttribute('data-prop-accessibilitystate')).toContain('"selected":false');
  });
});

describe('验证码发送语义（A2 §3.3/§6④）', () => {
  it('号码格式错点发送 → inline 红字（不调 sendSmsCode）', () => {
    const { container } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('123');
    });
    fireEvent.click(getSendCodeButton(container));

    expect(container.textContent ?? '').toContain('手机号格式不正确');
    expect(mockSendSmsCode).not.toHaveBeenCalled();
    expect(showToastMock).not.toHaveBeenCalled();
  });

  it('发送成功 → Toast(codeSentToast, success) + 倒计时启动', async () => {
    mockSendSmsCode.mockResolvedValueOnce({});
    const { container } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('77001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('验证码已发送', 'success');
    });
    // sendSmsCode 传原样 phone（不拼 +670）
    expect(mockSendSmsCode).toHaveBeenCalledWith('77001234');
    // 倒计时启动：发送按钮 accessibilityLabel 变为「重新发送 (Ns)」
    // Why: sendCode 内 startCountdown 同步 setCountdown(60)，但属异步函数内的状态更新，
    // 需 await waitFor 触发重渲染后 label 才切到 resend 文案。
    await waitFor(() => {
      expect(getSendCodeButton(container).getAttribute('data-prop-accessibilitylabel')).toContain('重新发送');
    });
  });

  it('发送失败 ApiError → Toast(codeSendFailed, error)', async () => {
    mockSendSmsCode.mockRejectedValueOnce(new ApiError(400, 'INVALID_PHONE', 'bad'));
    const { container } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('77001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('验证码发送失败', 'error');
    });
  });

  it('发送失败 网络异常（非 ApiError）→ Toast(networkError, error)', async () => {
    mockSendSmsCode.mockRejectedValueOnce(new Error('network'));
    const { container } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('77001234');
    });
    fireEvent.click(getSendCodeButton(container));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
    });
  });

  it('发送中 → 按钮 disabled（isSmsPending 消费）', () => {
    mockSmsState = 'sms-pending';
    const { container } = renderPage();

    const sendBtn = getSendCodeButton(container);
    // Why: register send-btn 显式 disabled={countdown>0||isSmsPending}，初始即 sms-pending → disabled。
    // 但 mock 壳 disabled 是「挡 onClick」语义，data-prop-disabled 是否落 attr 取决于壳实现；
    // 以 a11y disabled state 为准（受控状态字段的稳定透传证据）。
    expect(sendBtn.getAttribute('data-prop-accessibilitystate')).toContain('"disabled":true');
  });

  it('倒计时中再点发送 → 被拦截（不重复调 sendSmsCode）', async () => {
    mockSendSmsCode.mockResolvedValueOnce({});
    const { container } = renderPage();

    act(() => {
      getInputChangeText(container, 1)('77001234');
    });
    fireEvent.click(getSendCodeButton(container));
    await waitFor(() => {
      expect(mockSendSmsCode).toHaveBeenCalledTimes(1);
    });
    // Why: 首次发送成功后 startCountdown 同步 setCountdown(60)，需等重渲染后 label 切到
    // resend 才能确认倒计时已启动（countdown>0 是 sendCode 入口拦截条件）。
    await waitFor(() => {
      expect(getSendCodeButton(container).getAttribute('data-prop-accessibilitylabel')).toContain('重新发送');
    });

    // 倒计时已启动，再点（按钮 disabled，host 壳 onClick undefined 不触发）
    fireEvent.click(getSendCodeButton(container));
    expect(mockSendSmsCode).toHaveBeenCalledTimes(1);
  });
});

describe('注册失败 toast（A2 §6⑦ 固定文案）', () => {
  it('apply 失败 ApiError → Toast(register.failed, error)（非透传后端 message）', async () => {
    mockApply.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'some backend msg'));
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('1234567');
    });
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    fireEvent.click(getByText('注册成为骑手'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('注册失败，请稍后重试', 'error');
    });
  });

  it('apply 失败 网络异常（非 ApiError）→ Toast(networkError, error)', async () => {
    mockApply.mockRejectedValueOnce(new Error('network down'));
    const { container, getByText } = renderPage();

    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
      getInputChangeText(container, 1)('77001234');
      getInputChangeText(container, 3)('1234567');
    });
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    fireEvent.click(getByText('注册成为骑手'));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('网络异常，请重试', 'error');
    });
  });
});

describe('死字段清理回归（A2 §3.7 删除项）', () => {
  it('homeAddress 输入框已移除：无「居住地址」分组标题', () => {
    const { queryByText } = renderPage();
    expect(queryByText('居住地址')).toBeNull();
  });

  it('security 分组已移除：无「设置密码」/「确认密码」输入标签', () => {
    const { queryByText } = renderPage();
    expect(queryByText('设置密码')).toBeNull();
    expect(queryByText('确认密码')).toBeNull();
  });

  it('idCardNumber 不再兜底 0000000000：空提交触发「请输入证件号」（非后端兜底）', () => {
    const { getByText } = renderPage();
    fireEvent.click(getByText('注册成为骑手'));
    // 校验拦截在 apply 之前，证件号为空时走前端校验，不依赖后端兜底
    expect(getByText('请输入证件号')).toBeTruthy();
    expect(mockApply).not.toHaveBeenCalled();
  });
});

// 审查 P2-1（同源）：用户改正输入/勾选后，对应字段 inline 红字实时清除
describe('errors 输入实时清除（审查 P2-1 同源）', () => {
  it('触发 name 红字后改输入 → name 红字立即清除（其它字段红字仍残留）', () => {
    const { container, getByText, queryByText } = renderPage();

    fireEvent.click(getByText('注册成为骑手'));
    expect(getByText('请输入姓名')).toBeTruthy();

    // 改 name 输入 → clearFieldError('name') 清除红字
    act(() => {
      getInputChangeText(container, 0)('Adão Belo');
    });
    expect(queryByText('请输入姓名')).toBeNull();
    // 未改的 phone/证件号/协议 红字仍在（字段级精准清除）
    expect(getByText('请输入手机号')).toBeTruthy();
    expect(getByText('请输入证件号')).toBeTruthy();
  });

  it('触发协议红字后勾选 → 协议红字立即清除', () => {
    const { container, getByText, queryByText } = renderPage();

    fireEvent.click(getByText('注册成为骑手'));
    expect(getByText('请先同意服务条款和隐私政策')).toBeTruthy();

    // 勾选协议 → clearFieldError('terms') 清除红字
    // as unknown as 原因：query selector 返回 Element，需取 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
    const switchEl = container.querySelector('[data-rn-host="Switch"]') as unknown as {
      __fnProps: { onValueChange: (v: boolean) => void };
    };
    act(() => {
      switchEl.__fnProps.onValueChange(true);
    });
    expect(queryByText('请先同意服务条款和隐私政策')).toBeNull();
  });
});
