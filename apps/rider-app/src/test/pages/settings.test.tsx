/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import SettingsPage from '../../../app/settings';
import { showToast } from '../../../src/components/feedback/Toast';

/**
 * SettingsPage 单测 —— P3：设置页首帧闪中文与 Alert 割裂修复。
 *
 * 覆盖拍板（P3 §4 全 A）：
 *   ① P3-1 闪中文本页缓解：loading 期 Hero/Items 显骨架条，不渲染中文实体文案
 *   ② P3-2 Alert.alert → 项目 ConfirmDialog（tone='danger'），关闭通知走确认弹窗
 *   ③ P3-3 失败反馈：rotateLanguage/toggleNotifications try/catch + showToast(saveFailed)
 *   ④ P3-4 重复入口：删「骑手资料」MenuItem，无重复跳 /profile/edit
 *   ⑤ P3-6 error 态：Hero 显「设置加载失败」+ 重试，Items 不渲染
 *   ⑥ 语言 cycle 维持（不改）
 *
 * 桩法与 tasks/earnings.test.tsx 同源（web project + RN host 壳）：
 *   - useRiderSettings：mockSettingsState 切 ok/loading/error
 *   - useUpdateRiderSettings：mockMutateAsync 控 resolve/reject
 *   - showToast：mock 模块取 spy（ToastHost 不挂载，断言调用参数）
 *   - expo-router useRouter：spy push
 *   - react-native-safe-area-context：固定 insets
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

// showToast 被 jest.mock 成 jest.fn()（同 tasks.test 收窄写法，断言调用参数非渲染）
const showToastMock = showToast as jest.Mock;
const mockPush = jest.fn();
const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
// 'ok' | 'loading' | 'error'
let mockSettingsState = 'ok';
let mockSettings: { dutyStatus: string; language: string; notificationsEnabled: boolean };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/services/queries/useSettings', () => ({
  useRiderSettings: () => {
    if (mockSettingsState === 'loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockSettingsState === 'error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    return { data: mockSettings, isLoading: false, isError: false, refetch: mockRefetch };
  },
  useUpdateRiderSettings: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<SettingsPage />, { wrapper });
}

beforeEach(() => {
  mockPush.mockClear();
  mockMutateAsync.mockReset();
  mockRefetch.mockClear();
  showToastMock.mockClear();
  mockSettingsState = 'ok';
  mockSettings = { dutyStatus: 'onDuty', language: 'zh', notificationsEnabled: true };
});

describe('① P3-1 闪中文本页缓解（loading 骨架条，不渲染中文实体文案）', () => {
  it('loading 期 Hero/Items 显骨架条，不渲染「保持账号随时上岗」/「语言」/「通知」实体文案', () => {
    mockSettingsState = 'loading';
    const { queryByText } = renderPage();

    // 中文实体文案在 loading 期不应出现（闪中文根因的本页缓解）
    expect(queryByText('保持账号随时上岗')).toBeNull();
    expect(queryByText('语言')).toBeNull();
    expect(queryByText('通知')).toBeNull();
    expect(queryByText('账号与安全')).toBeNull();
  });

  it('loading 期不渲染 Switch（避免误显「开」）', () => {
    mockSettingsState = 'loading';
    const { container } = renderPage();

    // loading 期用骨架占位 View（h-7 w-12 rounded-full bg-surface-container），无真实 Switch host
    expect(container.querySelectorAll('[data-rn-host="Switch"]')).toHaveLength(0);
  });
});

describe('② P3-2 Alert.alert → ConfirmDialog（关闭通知走确认弹窗）', () => {
  it('关通知开关 → 不直接 mutateAsync，先弹 ConfirmDialog（标题「关闭通知？」）', async () => {
    const { container, getByText } = renderPage();

    // 取通知项的 Switch，触发 onValueChange(false)（host 壳经 __fnProps 透传，裹 act 让 ConfirmDialog flush）
    await triggerSwitchFalse(container);

    // 弹窗标题出现，且尚未 mutateAsync（需用户确认）
    expect(getByText('关闭通知？')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('确认弹窗点「关闭」→ mutateAsync({ notificationsEnabled: false })', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { container, getByText } = renderPage();

    await triggerSwitchFalse(container);

    await actAsync(() => {
      fireEvent.click(getByText('关闭'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabled: false });
  });

  it('确认弹窗点「保持开启」→ 不 mutateAsync，弹窗关闭', async () => {
    const { container, getByText } = renderPage();

    await triggerSwitchFalse(container);

    await actAsync(() => {
      fireEvent.click(getByText('保持开启'));
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    // 弹窗关闭：ConfirmDialog 的 Modal visible 不再为 true
    const openDialogs = Array.from(container.querySelectorAll('[data-rn-host="Modal"]')).filter(
      (m) => m.getAttribute('data-prop-visible') === 'true',
    );
    expect(openDialogs).toHaveLength(0);
  });

  it('开通知（true）→ 直接 mutateAsync({ notificationsEnabled: true })，不弹窗', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    // 初始 notificationsEnabled=false，切到 true 不应弹窗
    mockSettings = { dutyStatus: 'onDuty', language: 'zh', notificationsEnabled: false };
    const { container, queryByText } = renderPage();

    const switchEl = container.querySelector('[data-rn-host="Switch"]') as HTMLElement & { __fnProps?: { onValueChange?: (v: boolean) => void } };
    await actAsync(() => {
      switchEl.__fnProps?.onValueChange?.(true);
    });

    expect(queryByText('关闭通知？')).toBeNull();
    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabled: true });
  });
});

describe('③ P3-3 失败反馈（try/catch + showToast saveFailed）', () => {
  it('rotateLanguage mutateAsync reject → showToast(设置保存失败，请重试)', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));
    const { getByText } = renderPage();

    await actAsync(() => {
      fireEvent.click(getByText('语言'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ language: 'en' });
    expect(showToastMock).toHaveBeenCalledWith('设置保存失败，请重试', 'error');
  });

  it('confirmDisableNotifications mutateAsync reject → showToast saveFailed', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('network'));
    const { container, getByText } = renderPage();

    await triggerSwitchFalse(container);

    await actAsync(() => {
      fireEvent.click(getByText('关闭'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ notificationsEnabled: false });
    expect(showToastMock).toHaveBeenCalledWith('设置保存失败，请重试', 'error');
  });

  it('rotateLanguage 成功 → 无 error toast', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByText } = renderPage();

    await actAsync(() => {
      fireEvent.click(getByText('语言'));
    });

    expect(showToastMock).not.toHaveBeenCalled();
  });
});

describe('④ P3-4 重复入口（删「骑手资料」MenuItem）', () => {
  it('设置项仅 4 项：语言/通知/账号与安全/帮助中心（无「骑手资料」）', () => {
    const { queryByText, getByText } = renderPage();

    expect(getByText('语言')).toBeTruthy();
    expect(getByText('通知')).toBeTruthy();
    expect(getByText('账号与安全')).toBeTruthy();
    expect(getByText('帮助中心')).toBeTruthy();
    expect(queryByText('骑手资料')).toBeNull();
  });

  it('「账号与安全」跳 /profile/edit，「帮助中心」跳 /help（无重复 /profile/edit 入口）', () => {
    const { getByText } = renderPage();

    fireEvent.click(getByText('账号与安全'));
    fireEvent.click(getByText('帮助中心'));

    expect(mockPush).toHaveBeenCalledWith('/profile/edit');
    expect(mockPush).toHaveBeenCalledWith('/help');
    // 仅 1 次跳 /profile/edit（删了骑手资料后不重复）
    const profileEditCalls = mockPush.mock.calls.filter((c) => c[0] === '/profile/edit');
    expect(profileEditCalls).toHaveLength(1);
  });
});

describe('⑤ P3-6 error 态（Hero 显失败 + 重试，Items 不渲染）', () => {
  it('error 期 Hero 显「设置加载失败」+ 重试按钮，Items 不渲染', () => {
    mockSettingsState = 'error';
    const { getByText, queryByText } = renderPage();

    expect(getByText('设置加载失败')).toBeTruthy();
    expect(getByText('重试')).toBeTruthy();
    // Items 不渲染
    expect(queryByText('语言')).toBeNull();
    expect(queryByText('通知')).toBeNull();
  });

  it('点重试 → refetch', () => {
    mockSettingsState = 'error';
    const { getByText } = renderPage();

    fireEvent.click(getByText('重试'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('⑥ 语言 cycle 维持（不改）', () => {
  it('zh → 点语言项 → mutateAsync({ language: "en" })（cycle 切换，login 同款）', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByText } = renderPage();

    await actAsync(() => {
      fireEvent.click(getByText('语言'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ language: 'en' });
  });
});

/** act 包装（同步/异步交互统一落定后断言）。
 *  Switch 的 onValueChange 直调（host 壳经 __fnProps 透传）会同步触发 setConfirmVisible
 *  等 state 更新，必须裹 act 让 React flush，否则 ConfirmDialog 的 Modal 仍 visible=false。
 */
async function actAsync(fn: () => void) {
  await act(async () => {
    fn();
  });
}

/** 取通知项 Switch host 并同步触发 onValueChange（裹 act 让 ConfirmDialog 立即 flush） */
async function triggerSwitchFalse(container: HTMLElement) {
  const switchEl = container.querySelector('[data-rn-host="Switch"]') as HTMLElement & { __fnProps?: { onValueChange?: (v: boolean) => void } };
  await actAsync(() => {
    switchEl.__fnProps?.onValueChange?.(false);
  });
}
