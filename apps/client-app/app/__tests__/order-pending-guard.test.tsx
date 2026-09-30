/**
 * C-P2-18: review / after-sales-apply 提交按钮 isPending 期间 disabled（防重复提交）
 *
 * 批2 仅补测试不重修代码（v2 判已闭环）。mock 数据 hook + mutation，直接翻转
 * isPending 断言按钮 accessibilityState.disabled 翻转，且 pending 期间 press 不触发 mutate。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme';

const mockMutate = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'o1', orderId: 'o1', productId: 'p001' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({ useSafeBack: () => jest.fn() }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/i18n', () => ({
  useLocalizer: () => (text: unknown) => (typeof text === 'string' ? text : 'txt'),
}));

jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({
    isOffline: false,
    isConnected: true,
    isInternetReachable: true,
    isWeak: false,
  }),
}));

jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn() }));

jest.mock('@/services/queries/useOrders', () => {
  // 引用必须稳定：页面 useEffect 依赖 [order]，每次新对象会触发 setState 死循环
  const fakeOrder = {
    id: 'o1',
    status: 'DELIVERED',
    items: [
      {
        id: 'oi1',
        quantity: 1,
        product: { id: 'p001', name: 'Rice 1kg', price: 5, imageUrl: null },
      },
    ],
  };
  return {
    useOrder: () => ({
      data: fakeOrder,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
  };
});

// 真 useMutation 包 mock fn：isPending 由 RQ 状态驱动（reactive）——静态对象 mock 的
// isPending 在 hook 调用时求值，mutate 调用不触发重渲，双击用例的挂起窗口无法被页面拾取
jest.mock('@/services/queries/useReviews', () => {
  const { useMutation } =
    require('@tanstack/react-query') as typeof import('@tanstack/react-query');
  return {
    useOrderReviews: () => ({ data: [] }),
    useSubmitReview: () => useMutation({ mutationFn: (input: unknown) => mockMutate(input) }),
  };
});

jest.mock('@/services/queries/useRefunds', () => {
  const { useMutation } =
    require('@tanstack/react-query') as typeof import('@tanstack/react-query');
  return {
    useCreateRefund: () => useMutation({ mutationFn: (input: unknown) => mockMutateAsync(input) }),
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  // 每次渲染独立 QueryClient（useState 初始化器保证重渲不重建）
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};
const wrapper = TestWrapper;

beforeEach(() => {
  mockMutate.mockReset();
  mockMutateAsync.mockReset();
});

describe('C-P2-18 review.tsx 提交按钮 isPending disabled', () => {
  it('空闲态可提交：press 触发 mutate', async () => {
    const ReviewPage = require('../order/review').default;
    const { getByTestId } = render(<ReviewPage />, { wrapper });
    const btn = getByTestId('review-submit');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
    // reviewSchema 要求 content min(1)，默认空——填内容再提交
    fireEvent.changeText(getByTestId('review-content'), 'Great product, fast delivery!');
    fireEvent.press(btn);
    // RHF onBlur 校验 + handleSubmit 走微任务，需 flush 后断言
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
  });

  it('isPending 期间：accessibilityState.disabled=true 且 press 不重复提交', async () => {
    // mutate 挂起不 resolve——真 useMutation 下 isPending=true 的来源
    mockMutate.mockImplementation(() => new Promise(() => {}));
    const ReviewPage = require('../order/review').default;
    const { getByTestId } = render(<ReviewPage />, { wrapper });
    const btn = getByTestId('review-submit');
    fireEvent.changeText(getByTestId('review-content'), 'Great product, fast delivery!');
    fireEvent.press(btn);
    // RHF handleSubmit 校验走微任务 + isPending 重渲需 flush
    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(getByTestId('review-submit').props.accessibilityState?.disabled).toBe(true);
    });
    fireEvent.press(getByTestId('review-submit'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  // P2-1（审查）：真实挂起窗口的双击防重——首次 press 进 mutate（isPending 即刻翻 true），
  // 第二次 press 在重渲后的 disabled 按钮上必须被吞。非仅静态断言 props。
  it('快速双击：第二次 press 落在挂起窗口被吞，mutate 仅 1 次', async () => {
    // mutate 挂起不 resolve，保持 isPending=true 的真实窗口
    mockMutate.mockImplementation(() => new Promise(() => {}));
    const ReviewPage = require('../order/review').default;
    const { getByTestId } = render(<ReviewPage />, { wrapper });
    const btn = getByTestId('review-submit');
    fireEvent.changeText(getByTestId('review-content'), 'Great product, fast delivery!');
    fireEvent.press(btn);
    // mutate 已触发 → RQ isPending 翻 true → flush 后页面重渲拾取新 isPending
    await waitFor(() => {
      expect(getByTestId('review-submit').props.accessibilityState?.disabled).toBe(true);
    });
    fireEvent.press(getByTestId('review-submit'));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});

describe('C-P2-18 after-sales-apply.tsx 提交按钮 isPending disabled', () => {
  it('isPending 期间：accessibilityState.disabled=true 且 press 不重复提交', async () => {
    mockMutateAsync.mockImplementation(() => new Promise(() => {}));
    const ApplyPage = require('../order/after-sales-apply').default;
    const { getByTestId } = render(<ApplyPage />, { wrapper });
    const btn = getByTestId('aftersales-submit');
    // zod schema 要求 type/reason/description 非空，否则 handleSubmit 校验拦住 mutateAsync
    fireEvent.press(getByTestId('type-return-refund'));
    fireEvent.press(getByTestId('reason-afterSales.reasons.quality'));
    fireEvent.changeText(getByTestId('aftersales-content'), 'Item arrived damaged');
    fireEvent.press(btn);
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(getByTestId('aftersales-submit').props.accessibilityState?.disabled).toBe(true);
    });
    fireEvent.press(getByTestId('aftersales-submit'));
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
  });
});
