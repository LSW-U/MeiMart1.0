/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import ProfileEditPage from '../../../app/profile/edit';
import { showToast } from '../../../src/components/feedback/Toast';
import { ApiError } from '../../../src/services/api';
import type { RiderProfile } from '../../../src/types/rider';

/**
 * ProfileEditPage 单测 —— P2：资料编辑页死字段清理与只读降级。
 *
 * 覆盖拍板（P2 方案 §6 全 A）：
 *   §6① real 只读降级（isMockMode 首次入 UI 层）——real 态灰显+说明条+客服入口+无保存按钮
 *   §2② 标题 auth.register.title→profile.editTitle（显示「编辑资料」非「成为骑手伙伴」）
 *   §2③ 删 6 处死字段——无验证码/地址/密码/协议块/hero banner
 *   §2④ 字段错位修复——vehiclePlate 提交到 vehiclePlate（不再塞 licenseNumber），vehicleType 纳入 payload
 *   §2⑤ vehicleType 三选一 SegmentedControl
 *   §6⑥ 手写校验——name/phone/idCardNumber 红字
 *
 * 桩法与 register/profile.test.tsx 同源（web project + RN host 壳）：
 *   - useUpdateProfile：mockMutateAsync 控制成功/reject
 *   - useAuthStore：rider 真实字段（riderName/phone/vehicleType/vehiclePlate/licenseNumber）
 *   - src/services/api：isMockMode 切 mock/real 两态（mockModeState）
 *   - useRiderSettings：language='zh' 走 zh 字典
 *   - showToast：mock 模块取 spy
 *   - expo-router：页面测试不关心导航（mockPush 断言跳转目标）
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const showToastMock = showToast as jest.Mock;
const mockMutateAsync = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

// 'mock' | 'real' —— 控制 isMockMode（real=只读降级）
let mockModeState = 'mock';

// 桩 rider 必须是稳定引用：useEffect dep=[rider]，若 selector 每次返回新对象会触发 setForm→rerender→新 rider→死循环（Maximum update depth）
const mockRider: RiderProfile = {
  id: 'r-001', userId: 'u-1', riderName: 'Alex 骑手', phone: '+670 77001234',
  vehicleType: 'MOTORCYCLE', vehiclePlate: 'DL-1234', status: 'ONLINE', applicationStatus: 'APPROVED',
  totalDeliveries: 128, rating: 4.9, preferredWarehouseIds: [], isOnline: true, createdAt: '', updatedAt: '',
  name: 'Alex 骑手', licenseNumber: '1234567',
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => ({ data: { dutyStatus: 'onDuty', language: 'zh' } }),
}));

jest.mock('../../../src/services/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
      this.name = 'ApiError';
    }
  },
  get isMockMode() {
    return mockModeState === 'mock';
  },
}));

jest.mock('../../../src/services/queries/useRider', () => ({
  useUpdateProfile: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/store/useAuthStore', () => ({
  useAuthStore: (selector: (s: { rider: RiderProfile | null; hydrate: () => Promise<void> }) => unknown) =>
    selector({
      rider: mockRider,
      hydrate: async () => {},
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
  return render(<ProfileEditPage />, { wrapper });
}

/** 取第 N 个 TextInput 的 onChangeText（host 壳经 __fnProps 透传函数 prop）。 */
function getInputChangeText(container: HTMLElement, index = 0): (v: string) => void {
  const inputs = container.querySelectorAll('[data-rn-host="TextInput"]');
  // as unknown as 原因：query selector 返回 Element，需取测试 host 壳挂在节点的 __fnProps（非标准 DOM 属性）
  const input = inputs[index] as unknown as { __fnProps: { onChangeText: (v: string) => void } };
  return input.__fnProps.onChangeText;
}

/** 取 vehicleType 三选一某项（accessibilityLabel=摩托车/自行车/汽车）。 */
function getVehicleOption(container: HTMLElement, label: string): Element {
  const buttons = container.querySelectorAll('[data-rn-host="Pressable"]');
  const btn = Array.from(buttons).find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === label);
  return btn!;
}

/** 取保存按钮（accessibilityLabel=「保存资料」）；real 只读态返回 undefined。 */
function getSaveButton(container: HTMLElement): Element | undefined {
  const buttons = container.querySelectorAll('[data-rn-host="Pressable"]');
  return Array.from(buttons).find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '保存资料');
}

beforeEach(() => {
  showToastMock.mockClear();
  mockMutateAsync.mockReset();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockModeState = 'mock';
});

describe('死字段清理（P2 §2③ 删 6 处死字段）', () => {
  it('无注册 hero banner「成为骑手伙伴」、无验证码、无地址、无密码、无协议勾选', () => {
    const { queryByText } = renderPage();

    // hero banner / 标题错用 register key（§2② 标题改 profile.editTitle，故不应出现「成为骑手伙伴」）
    expect(queryByText('成为骑手伙伴')).toBeNull();
    // 验证码 Input 删除
    expect(queryByText('验证码')).toBeNull();
    // 家庭地址 TextInput 删除
    expect(queryByText('家庭地址')).toBeNull();
    // 密码分组删除
    expect(queryByText('设置密码')).toBeNull();
    // 协议勾选 Switch 块删除
    expect(queryByText('同意条款')).toBeNull();
  });

  it('页头标题显示「编辑资料」（profile.editTitle），非「成为骑手伙伴」', () => {
    const { getByText } = renderPage();
    expect(getByText('编辑资料')).toBeTruthy();
  });
});

describe('字段错位修复（P2 §2④ vehiclePlate 提交到 vehiclePlate + vehicleType 纳入 payload）', () => {
  it('保存提交：payload 含 vehiclePlate（真实车牌 DL-1234）、vehicleType、riderName，不再把 licenseNumber 塞进 vehiclePlate', async () => {
    const { container } = renderPage();

    const saveBtn = getSaveButton(container);
    expect(saveBtn).toBeTruthy();
    // host 壳 onPress 接 onClick：fireEvent.click 等价按下保存按钮（同 profile.test.tsx 范式）
    mockMutateAsync.mockResolvedValueOnce({});
    await act(async () => {
      fireEvent.click(saveBtn as Element);
      await Promise.resolve();
    });

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    const payload = mockMutateAsync.mock.calls[0][0];
    // 字段错位修复核心：vehiclePlate 提交真实车牌，而非把 idCardNumber(licenseNumber) 塞进去
    expect(payload).toHaveProperty('vehiclePlate', 'DL-1234');
    expect(payload).toHaveProperty('vehicleType', 'MOTORCYCLE');
    expect(payload).toHaveProperty('riderName', 'Alex 骑手');
    // idCardNumber 不可提交（RiderProfile 无此字段）
    expect(payload).not.toHaveProperty('idCardNumber');
  });
});

describe('vehicleType 三选一（P2 §2⑤ SegmentedControl）', () => {
  it('点击「自行车」切 selected 态，保存提交 vehicleType=BICYCLE', async () => {
    const { container } = renderPage();

    const bikeBtn = getVehicleOption(container, '自行车');
    fireEvent.click(bikeBtn);

    const saveBtn = getSaveButton(container)!;
    mockMutateAsync.mockResolvedValueOnce({});
    await act(async () => {
      fireEvent.click(saveBtn);
      await Promise.resolve();
    });

    const payload = mockMutateAsync.mock.calls[0][0];
    expect(payload).toHaveProperty('vehicleType', 'BICYCLE');
  });
});

describe('手写校验（P2 §6⑥ mock 模式）', () => {
  it('清空姓名后保存：riderName 红字「请输入姓名」，不调 mutateAsync', async () => {
    const { container } = renderPage();

    // 第 0 个 TextInput = riderName（fullName），清空
    const setName = getInputChangeText(container, 0);
    act(() => setName(''));

    const saveBtn = getSaveButton(container)!;
    await act(async () => {
      fireEvent.click(saveBtn);
      await Promise.resolve();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    // errors.nameRequired 渲染为 error Text
    const errorTexts = Array.from(container.querySelectorAll('[data-rn-host="Text"]'))
      .map((el) => el.textContent ?? '');
    expect(errorTexts).toContain('请输入姓名');
  });

  it('手机号格式错误：phoneInvalid 红字', async () => {
    const { container } = renderPage();

    // 第 1 个 TextInput = phone，填非法格式
    const setPhone = getInputChangeText(container, 1);
    act(() => setPhone('abc'));

    const saveBtn = getSaveButton(container)!;
    await act(async () => {
      fireEvent.click(saveBtn);
      await Promise.resolve();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    const errorTexts = Array.from(container.querySelectorAll('[data-rn-host="Text"]'))
      .map((el) => el.textContent ?? '');
    expect(errorTexts).toContain('手机号格式不正确');
  });
});

describe('保存成功反馈（P2 §3.5 mock 模式）', () => {
  it('保存成功：showToast「资料已保存」+ router.replace(/(main)/profile)', async () => {
    const { container } = renderPage();

    const saveBtn = getSaveButton(container)!;
    mockMutateAsync.mockResolvedValueOnce({});
    await act(async () => {
      fireEvent.click(saveBtn);
      await Promise.resolve();
    });

    expect(showToastMock).toHaveBeenCalledWith('资料已保存', 'success');
    expect(mockReplace).toHaveBeenCalledWith('/(main)/profile');
  });

  it('保存失败（ApiError）：showToast「资料保存失败，请稍后重试」', async () => {
    const { container } = renderPage();

    const saveBtn = getSaveButton(container)!;
    const apiErr = new ApiError(500, 'update_failed', 'boom');
    mockMutateAsync.mockRejectedValueOnce(apiErr);
    await act(async () => {
      fireEvent.click(saveBtn);
      await Promise.resolve();
    });

    expect(showToastMock).toHaveBeenCalledWith('资料保存失败，请稍后重试', 'error');
  });
});

describe('real 只读降级（P2 §6① isMockMode 首次入 UI 层）', () => {
  it('real 模式：显示说明条「资料修改即将开放」+ 客服入口，无保存按钮', () => {
    mockModeState = 'real';
    const { getByText, queryByText, container } = renderPage();

    // 顶部说明条
    expect(getByText('资料修改即将开放')).toBeTruthy();
    expect(getByText('如需更新请联系客服')).toBeTruthy();
    // 客服入口按钮（accessibilityLabel=「如需更新请联系客服」）
    const contactBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '如需更新请联系客服');
    expect(contactBtn).toBeTruthy();
    // 无保存按钮
    expect(getSaveButton(container)).toBeUndefined();
    expect(queryByText('保存资料')).toBeNull();
  });

  it('real 模式点客服入口跳 /help', () => {
    mockModeState = 'real';
    const { container } = renderPage();

    const contactBtn = Array.from(container.querySelectorAll('[data-rn-host="Pressable"]'))
      .find((el) => (el.getAttribute('data-prop-accessibilitylabel') ?? '') === '如需更新请联系客服')!;
    act(() => {
      fireEvent.click(contactBtn);
    });
    expect(mockPush).toHaveBeenCalledWith('/help');
  });

  it('mock 模式：无说明条，有保存按钮', () => {
    mockModeState = 'mock';
    const { queryByText, container } = renderPage();

    expect(queryByText('资料修改即将开放')).toBeNull();
    expect(getSaveButton(container)).toBeTruthy();
  });
});
