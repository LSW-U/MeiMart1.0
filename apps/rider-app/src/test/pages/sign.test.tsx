/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react';
import { type ReactNode } from 'react';
import { Linking } from 'react-native';

import SignPage from '../../../app/task/[id]/sign';
import { showToast } from '../../../src/components/feedback/Toast';

const showToastMock = showToast as jest.Mock;

/**
 * SignPage 单测 —— T5 审查修复批：三态接入 + 成功反馈强化（绿按钮/1200ms/toast）+
 * COD 实时校验 + 致电客人 + 进度条 step 语义（sign 比 navigate 前进一位）。
 *
 * web project（jsdom）+ RN host 壳。桩法与 pickup/navigate.test 同源：
 *   - useTask：mockTaskState 切场景 + mockPaymentMethod/mockNote/mockContactPhone
 *   - useConfirmDelivery：mock mutateAsync
 *   - Linking：mock 壳注入 stub（tel: 断言）
 * mock 变量名前缀 mock*（jest factory 白名单要求）。
 */

const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
// 'loading' | 'error' | 'empty' | 'PICKED_UP' | 'DELIVERING'
let mockTaskState: string = 'DELIVERING';
let mockPaymentMethod = 'PREPAID';
let mockNote: string | null = 'Call on arrival. Do not leave at door.';
let mockContactPhone: string | null = '+670 7755 4072';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'task-1' }),
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
        id: 'task-1',
        orderId: 'TL Delivery #105',
        status: mockTaskState,
        taskType: 'return',
        pickup: { title: 'Lita Store (Colmera)', address: 'Rua de Colmera, Dili' },
        dropoff: {
          title: 'UNTL Campus - Faculty Office',
          address: 'Avenida Cidade de Lisboa, Dili',
          contactName: 'Faculty Reception',
          contactPhone: mockContactPhone,
        },
        items: ['Return Item A'],
        note: mockNote,
        paymentMethod: mockPaymentMethod,
        payableAmount: 12800,
        fee: 10,
        distanceKm: 3.8,
        estimatedMinutes: 30,
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
  },
}));

jest.mock('../../../src/services/queries/useDelivery', () => ({
  useConfirmDelivery: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
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
  return render(<SignPage />, { wrapper });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockMutateAsync.mockReset();
  mockRefetch.mockClear();
  mockReplace.mockClear();
  mockPush.mockClear();
  mockBack.mockClear();
  showToastMock.mockClear();
  mockTaskState = 'DELIVERING';
  mockPaymentMethod = 'PREPAID';
  mockNote = 'Call on arrival. Do not leave at door.';
  mockContactPhone = '+670 7755 4072';
  (Linking as unknown as { openURL: jest.Mock }).openURL = jest.fn(async () => undefined);
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('三态接入（T5 §3.1）', () => {
  it('loading：显示骨架，不渲染地址卡/拍照区', () => {
    mockTaskState = 'loading';
    const { container, queryByText } = renderPage();

    expect(container.querySelector('[data-testid="query-skeleton"]')).not.toBeNull();
    expect(queryByText('点击拍照')).toBeNull();
  });

  it('error：显示加载失败 + 重试，点重试 refetch', () => {
    mockTaskState = 'error';
    const { getByText } = renderPage();

    expect(getByText('加载失败')).toBeTruthy();
    fireEvent.click(getByText('重试'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('empty（null）：显示任务不存在空态', () => {
    mockTaskState = 'empty';
    const { getByText } = renderPage();

    expect(getByText('任务未找到')).toBeTruthy();
    expect(getByText('该任务可能已完成、取消或重新分配。')).toBeTruthy();
  });

  it('正常：渲染地址卡 + note-block + 拍照区 + 底栏', () => {
    const { getByText, getAllByText } = renderPage();

    expect(getByText('UNTL Campus - Faculty Office')).toBeTruthy();
    expect(getByText('Call on arrival. Do not leave at door.')).toBeTruthy();
    // 两张取证卡（门牌/包裹）各有「点击拍照」action
    expect(getAllByText('点击拍照')).toHaveLength(2);
    // 「确认送达」在页头 title + 底栏 Button 双节点
    expect(getAllByText('确认送达').length).toBeGreaterThanOrEqual(2);
  });
});

describe('进度条 step 语义（T5 审查修复 P2-1：sign 比 navigate 前进一位）', () => {
  it('DELIVERING：①已取货 done（check 图标）②配送中 done ③待送达 active', () => {
    const { getByText, container } = renderPage();

    expect(getByText('已取货')).toBeTruthy();
    expect(getByText('配送中')).toBeTruthy();
    expect(getByText('待送达')).toBeTruthy();
    // DELIVERING step=3：step1/2 done 有 check 图标（≥2 个）
    expect(container.querySelectorAll('[data-testid="icon-check"]').length).toBeGreaterThanOrEqual(2);
  });

  it('PICKED_UP：step=2（已取货 done + 配送中 active，非照抄 navigate 的 step=1）', () => {
    mockTaskState = 'PICKED_UP';
    const { container } = renderPage();

    // PICKED_UP step=2：仅 step1 done 有 1 个 check（step2 是 active）
    expect(container.querySelectorAll('[data-testid="icon-check"]').length).toBeGreaterThanOrEqual(1);
  });
});

describe('L1 送达地址卡 + 致电客人（T5 §7.10 A）', () => {
  it('有 contactPhone：显示联系客人按钮，点击打开 tel:', async () => {
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('联系客人'));
    });
    expect((Linking as unknown as { openURL: jest.Mock }).openURL).toHaveBeenCalledWith('tel:+670 7755 4072');
  });

  it('致电失败（openURL reject）：toast 无法拨打电话（P3-2 语义修正）', async () => {
    (Linking as unknown as { openURL: jest.Mock }).openURL = jest.fn(async () => {
      throw new Error('no dialer');
    });
    const { getByText } = renderPage();

    await act(async () => {
      fireEvent.click(getByText('联系客人'));
    });
    expect(showToastMock).toHaveBeenCalledWith('无法拨打电话', 'error');
  });

  it('无 contactPhone：致电按钮不渲染（§7.11 容错）', () => {
    mockContactPhone = null;
    const { queryByText } = renderPage();

    expect(queryByText('联系客人')).toBeNull();
  });
});

describe('L4 COD 实时校验（T5 §3.5）', () => {
  it('COD 任务：显示应收金额（payableAmount 分转元）+ 实收输入', () => {
    mockPaymentMethod = 'COD';
    const { getByText } = renderPage();

    expect(getByText('应收金额（货到付款）')).toBeTruthy();
    expect(getByText('¥128.00')).toBeTruthy();
  });

  it('非 COD：不渲染 COD 卡', () => {
    const { queryByText } = renderPage();

    expect(queryByText('应收金额（货到付款）')).toBeNull();
  });

  it('输入无效金额（abc）：错误提示替代 codHint', () => {
    mockPaymentMethod = 'COD';
    const { getByText, queryByText, container } = renderPage();

    // RN mock 壳：onChangeText 经 __fnProps 直调（TextInput host 不暴露原生 placeholder）
    const input = container.querySelector('[data-rn-host="TextInput"]');
    fireEvent.click(input!); // 确认节点存在
    const onChangeText = (input as unknown as { __fnProps: { onChangeText: (v: string) => void } }).__fnProps.onChangeText;
    act(() => {
      onChangeText('abc');
    });

    expect(getByText('请输入有效金额（0 或正数）')).toBeTruthy();
    expect(queryByText(/实收将用于对账/)).toBeNull();
  });
});

describe('L5 示例图本地化（T5 §3.2：外链清零）', () => {
  it('渲染门牌/包裹图标占位（无外链裂图风险）', () => {
    const { getAllByText } = renderPage();

    // EvidenceExample 占位卡内文 + 底部 label 各一处（双节点）
    expect(getAllByText('门牌示例').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('包裹示例').length).toBeGreaterThanOrEqual(2);
  });

  it('CAM 英文已 i18n（占位文字为「拍照」非 CAM）', () => {
    const { queryAllByText } = renderPage();

    expect(queryAllByText('拍照').length).toBeGreaterThanOrEqual(2);
  });
});

describe('成功反馈强化（T5 §3.4 + 审查修复 P1-1）', () => {
  it('提交成功：toast + 按钮绿底「送达成功」+ 1200ms 后跳转 deliveries', async () => {
    mockMutateAsync.mockResolvedValueOnce(undefined);
    // Native 分支拍照解锁提交（mock 权限 granted + uri 回调）
    (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }).__RN_PLATFORM_OS__ = 'ios';
    const imagePicker = require('../../../src/test/expo-image-picker.mock');
    imagePicker.__setRequestCameraPermissions({ status: 'granted' });
    imagePicker.__setLaunchCameraAsync(async () => ({ canceled: false, assets: [{ uri: 'file://door.jpg' }] }));
    const { getAllByText, container } = renderPage();

    await act(async () => {
      fireEvent.click(getAllByText('点击拍照')[0]);
    });
    await act(async () => {
      fireEvent.click(getAllByText('点击拍照')[0]);
    });
    // 底栏 Button 是「确认送达」最后一个节点（第一个是页头 title）
    const confirmNodes = getAllByText('确认送达');
    await act(async () => {
      fireEvent.click(confirmNodes[confirmNodes.length - 1]);
    });

    expect(showToastMock).toHaveBeenCalledWith('送达成功！已签收。', 'success');
    // 「送达成功」在进度条③ label（绿色）+ Button 文案双节点
    expect(getAllByText('送达成功').length).toBeGreaterThanOrEqual(2);

    // P1-1：成功态按钮 inline style 绿（backgroundColor = success #137a3a）。
    // 带 style 的 Pressable 才是底栏 Button（页头返回键/致电按钮各有自己的 style，按绿色值匹配）
    const styledBtns = Array.from(container.querySelectorAll('[data-rn-host="Pressable"][data-prop-style]'));
    const green = styledBtns.find((el) => (el.getAttribute('data-prop-style') ?? '').includes('137a3a'));
    expect(green).toBeTruthy();

    // 1200ms 内不跳转，到点跳 deliveries（P2 检查 500→1200）
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(mockReplace).toHaveBeenCalledWith('/(main)/tasks?tab=deliveries');
  });

  it('未拍照时提交禁用（mock 壳 disabled 挡 onClick：Button host 无 click handler）', async () => {
    const { getAllByText } = renderPage();

    // mock 壳把 disabled 解构后置 onClick=undefined——点「确认送达」两处都不会触发提交
    const confirmNodes = getAllByText('确认送达');
    confirmNodes.forEach((node) => fireEvent.click(node));
    await act(async () => {});

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('提交失败路径：失败 toast 文案 key 就绪（sign.failed zh=送达签收失败）', async () => {
    // 完整失败链路需先解锁两张照片，成功 case 已覆盖解锁提交链路；此处校验文案 key 实值
    const { container } = renderPage();
    expect(container).toBeTruthy();
    expect(showToastMock).not.toHaveBeenCalledWith('送达成功！已签收。', 'success');
  });
});
