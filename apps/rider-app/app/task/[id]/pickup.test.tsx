/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import PickupPage from './pickup';
import { showToast } from '../../../src/components/feedback/Toast';
import imagePicker from '../../../src/test/expo-image-picker.mock';

const showToastMock = showToast as jest.Mock;

/**
 * PickupPage 单测 —— T3：三态接入（QueryBoundary loading/error/empty）+ 订单号用
 * orderId（非路由 UUID）+ processing 语义（无「已核对」文案，成功 toast）+
 * EvidenceUpload 权限拒/相机异常提示。
 *
 * web project（jsdom）+ RN host 壳。桩法与 [id].test.tsx 同源：
 *   - useTask：mockTask 三态切换（null=不存在 / undefined+isError=query 失败 / ASSIGNED=正常）
 *   - useGoBack：桩（StepPageHeader 内部）
 *   - expo-image-picker：可控 mock（权限/拍照结果注入）
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockRefetch = jest.fn();
const mockMutateAsync = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
// 三态驱动：'loading' | 'error' | 'empty' | 'ASSIGNED' | 'PICKED_UP'
let mockTaskState: string = 'ASSIGNED';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'internal-uuid-1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../../../src/hooks/useGoBack', () => ({
  useGoBack: () => mockBack,
}));

jest.mock('../../../src/services/queries/useTask', () => ({
  useTask: () => {
    if (mockTaskState === 'loading') return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockTaskState === 'error') return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    if (mockTaskState === 'empty') return { data: null, isLoading: false, isError: false, refetch: mockRefetch };
    return {
      data: {
        id: 'internal-uuid-1',
        orderId: 'TL Delivery #102',
        status: mockTaskState,
        taskType: 'DELIVERY',
        pickup: { title: '乐购超市', address: '杨浦区' },
        dropoff: { title: '久久公寓', address: '1 号楼' },
        items: ['超市'],
        fee: 10,
        distanceKm: 3.7,
        estimatedMinutes: 30,
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  },
}));

jest.mock('../../../src/services/queries/useDelivery', () => ({
  useConfirmPickup: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('../../../src/hooks/useNetwork', () => ({
  useNetwork: () => ({ isConnected: true, isOffline: false }),
}));

jest.mock('../../../src/components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<PickupPage />, { wrapper });
}

beforeEach(() => {
  mockRefetch.mockClear();
  mockMutateAsync.mockReset();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  showToastMock.mockClear();
  mockTaskState = 'ASSIGNED';
  // Platform 回归 web（默认分支）；Native-only 用例单独置 ios
  (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }).__RN_PLATFORM_OS__ = 'web';
  imagePicker.__setRequestCameraPermissions({ status: 'granted' });
  imagePicker.__setLaunchCameraAsync(async () => ({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] }));
});

describe('三态接入（T3 §3.1）', () => {
  it('loading：显示骨架（query-skeleton），不渲染取证卡', () => {
    mockTaskState = 'loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('点击拍照')).toBeNull();
  });

  it('error：显示加载失败 + 重试按钮，不渲染取证卡（弱网不再照常可提交）', () => {
    mockTaskState = 'error';
    const { getByText, queryByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    expect(getByText('重试')).toBeTruthy();
    expect(queryByText('点击拍照')).toBeNull();
  });

  it('error：点重试触发 refetch', () => {
    mockTaskState = 'error';
    const { getByText } = renderPage();

    fireEvent.click(getByText('重试'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('empty（null）：显示任务不存在空态，非误报加载失败', () => {
    mockTaskState = 'empty';
    const { getByText, queryByText } = renderPage();

    expect(getByText('任务不存在')).toBeTruthy();
    expect(getByText('该任务可能已被处理或取消')).toBeTruthy();
    expect(queryByText('加载失败')).toBeNull();
    expect(queryByText('点击拍照')).toBeNull();
  });

  it('正常（ASSIGNED）：渲染取证卡 + 提交按钮', () => {
    const { getByText, container } = renderPage();

    expect(getByText('点击拍照')).toBeTruthy();
    expect(getByText('确认并开始配送')).toBeTruthy();
    expect(container.querySelector('[data-testid="query-skeleton"]')).toBeNull();
  });
});

describe('订单号修正（T3 §3.2）', () => {
  it('显示 task.orderId（TL Delivery #102）非路由内部 id', () => {
    const { getByText, queryByText } = renderPage();

    expect(getByText('订单 #TL Delivery #102')).toBeTruthy();
    // 内部 UUID 不出现
    expect(queryByText(/internal-uuid-1/)).toBeNull();
  });

  it('取证卡标题用「商家小票」非重复的「核对小票」（P3-1）', () => {
    const { getAllByText, getByText } = renderPage();

    // 核对区段标题 1 次（:76）；取证卡 title 是「商家小票」（P3-1 修复，原型 ev-title）
    expect(getAllByText('核对小票')).toHaveLength(1);
    expect(getByText('商家小票')).toBeTruthy();
  });
});

describe('processing 语义 + 成功反馈（T3 §3.3/§3.4）', () => {
  it('提交成功：toast「订单已核对，开始配送」（success），跳转 pickups tab', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    // Native 分支：拍照（mock 权限 granted + uri 回调）→ captured=true → 提交可点
    (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }).__RN_PLATFORM_OS__ = 'ios';
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('点击拍照'));
    });
    await act(async () => {
      fireEvent.click(getByText('确认并开始配送'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({ taskId: 'internal-uuid-1', evidence: { photoUri: 'file://photo.jpg' } });
    expect(showToastMock).toHaveBeenCalledWith('订单已核对，开始配送。', 'success');
    expect(mockReplace).toHaveBeenCalledWith('/(main)/tasks?tab=pickups');
  });

  it('未拍照时提交禁用（SwipeButton disabled 挡 click，弱网/漏拍不误提交）', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    const { getByText } = renderPage();

    // web 分支：captured=false → disabled；host 壳 disabled 挡掉 onClick
    fireEvent.click(getByText('确认并开始配送'));

    await act(async () => {});
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('processing 文案行已删（无「已核对」字样出现在提交区外）', () => {
    const { queryByText } = renderPage();

    // 原文案含 #102 硬编码，已删除；success toast 只在提交后出现
    expect(queryByText('订单 #102 已核对，开始配送。')).toBeNull();
  });
});

describe('EvidenceUpload 权限/异常治理（T3 §3.5/§3.6，Native 分支）', () => {
  it('相机权限拒绝：toast 提示（非静默）', async () => {
    (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }).__RN_PLATFORM_OS__ = 'ios';
    imagePicker.__setRequestCameraPermissions({ status: 'denied' });
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('点击拍照'));
    });

    expect(showToastMock).toHaveBeenCalledWith('需要相机权限才能拍照，请在设置中开启', 'error');
  });

  it('相机异常（launchCameraAsync reject）：toast 提示，不裸抛', async () => {
    (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }).__RN_PLATFORM_OS__ = 'ios';
    imagePicker.__setLaunchCameraAsync(async () => {
      throw new Error('camera unavailable');
    });
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('点击拍照'));
    });

    expect(showToastMock).toHaveBeenCalledWith('拍照出错，请重试', 'error');
  });
});

describe('守卫（已有行为回归，T3 §7.1 拍板 A）', () => {
  it('PICKED_UP：跳转 navigate（防止重复取货 409）', () => {
    mockTaskState = 'PICKED_UP';
    renderPage();

    expect(mockReplace).toHaveBeenCalledWith('/task/internal-uuid-1/navigate');
  });
});
