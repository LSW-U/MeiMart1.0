/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';

import PickupPage from '../../../app/task/[id]/pickup';
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
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
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
    if (mockTaskState === 'loading')
      return { data: undefined, isLoading: true, isError: false, refetch: mockRefetch };
    if (mockTaskState === 'error')
      return { data: undefined, isLoading: false, isError: true, refetch: mockRefetch };
    if (mockTaskState === 'empty')
      return { data: null, isLoading: false, isError: false, refetch: mockRefetch };
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
  (
    globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }
  ).__RN_PLATFORM_OS__ = 'web';
  imagePicker.__setRequestCameraPermissions({ status: 'granted' });
  imagePicker.__setLaunchCameraAsync(async () => ({
    canceled: false,
    assets: [{ uri: 'file://photo.jpg' }],
  }));
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
  it('显示 task.orderId（TL Delivery #102）非路由内部 id，无双 #（A5）', () => {
    const { getByText, queryByText } = renderPage();

    // A5：orderId 值自带 # 时前导 # 被 trim，模板 # 兜底分隔 → 单 #
    expect(getByText('订单 #TL Delivery #102')).toBeTruthy();
    expect(queryByText(/##/)).toBeNull();
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
    (
      globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }
    ).__RN_PLATFORM_OS__ = 'ios';
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('点击拍照'));
    });
    await act(async () => {
      fireEvent.click(getByText('确认并开始配送'));
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      taskId: 'internal-uuid-1',
      evidence: { photoUri: 'file://photo.jpg' },
    });
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
    (
      globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }
    ).__RN_PLATFORM_OS__ = 'ios';
    imagePicker.__setRequestCameraPermissions({ status: 'denied' });
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('点击拍照'));
    });

    expect(showToastMock).toHaveBeenCalledWith('需要相机权限才能拍照，请在设置中开启', 'error');
  });

  it('相机异常（launchCameraAsync reject）：toast 提示，不裸抛', async () => {
    (
      globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }
    ).__RN_PLATFORM_OS__ = 'ios';
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

/**
 * Web 分支修复 20261113：handleFile 曾传占位尺寸 1×1 → generic minEdge:100 必抛
 * E-UPLOAD-016（web 拍照全被拦死）。现 readAsDataURL 后 Image 解码取 naturalWidth/Height
 * 走真实 precheck。jsdom 无图片解码能力，Image 用可控桩（naturalWidth/Height 注入 + onload/onerror）。
 */
describe('EvidenceUpload web 分支尺寸校验（修复 20261113）', () => {
  // Image 桩：记录最后实例，测试按用例注入 naturalWidth/Height 并手动触发回调
  let lastImg: {
    naturalWidth: number;
    naturalHeight: number;
    src: string;
    onload: (() => void) | null;
    onerror: (() => void) | null;
  } | null = null;

  const realImage = window.Image;
  const setFakeImage = (impl: unknown) => {
    // jsdom 的 window 允许属性赋值覆盖（Image 可写），无需 defineProperty/as 断言
    (window as { Image: unknown }).Image = impl;
  };
  beforeAll(() => {
    setFakeImage(function FakeImage() {
      const instance = {
        naturalWidth: 0,
        naturalHeight: 0,
        src: '',
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      lastImg = instance;
      return instance;
    });
  });
  afterAll(() => {
    setFakeImage(realImage);
    lastImg = null;
  });

  const fireChange = (container: HTMLElement, file: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
  };

  // 1×1 透明 PNG（真实可解码字节，FileReader.readAsDataURL 同步可用）
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const makeFile = (sizeBytes = pngBase64.length) =>
    new File(['x'.repeat(sizeBytes)], 'photo.jpg', { type: 'image/jpeg' });

  it('小图（naturalWidth<100）：toast 图片尺寸过小，不进 captured 态', async () => {
    const { container, getByText, queryByText } = renderPage();
    fireChange(container, makeFile());
    // FileReader 在 jsdom 里是宏任务级异步（~几十 ms），需等 reader.onload 跑完才创建 Image
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      expect(lastImg).not.toBeNull();
      lastImg!.naturalWidth = 50;
      lastImg!.naturalHeight = 50;
      lastImg!.onload!();
    });

    expect(showToastMock).toHaveBeenCalledWith('图片尺寸过小', 'error');
    expect(queryByText('已捕获照片')).toBeNull();
    expect(getByText('点击拍照')).toBeTruthy();
  });

  it('大图（≥100）：通过预校验，进入 captured 态显示已拍照片', async () => {
    const { container, getByText } = renderPage();
    fireChange(container, makeFile());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      lastImg!.naturalWidth = 1080;
      lastImg!.naturalHeight = 1920;
      lastImg!.onload!();
    });

    expect(showToastMock).not.toHaveBeenCalled();
    expect(getByText('已捕获照片')).toBeTruthy();
  });

  it('解码失败（损坏图片）：onerror → toast 拍照出错，不裸抛', async () => {
    const { container } = renderPage();
    fireChange(container, makeFile());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      lastImg!.onerror!();
    });

    expect(showToastMock).toHaveBeenCalledWith('拍照出错，请重试', 'error');
  });
});
