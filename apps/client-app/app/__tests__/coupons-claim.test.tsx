/**
 * 领券中心页（app/coupons/claim.tsx）基础渲染测试（规则 8）
 *
 * 放 app 下 __tests__ 目录（非 app/coupons/__tests__）：jest testMatch 的
 * micromatch 把括号/嵌套路由目录名当特殊语法，refunds.test 同模式。
 *
 * mock 外部 service/hook + ThemeProvider 包裹 + i18n 返 key。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import ClaimPage from '../coupons/claim';

const mockRefetch = jest.fn();
let mockAvailable: {
  data: {
    id: string;
    code: string;
    name: string;
    description: null;
    type: 'FIXED_AMOUNT';
    value: number;
    minOrderAmount: number;
    maxDiscountAmount: null;
    startAt: string;
    endAt: string;
    status: 'available';
  }[];
  isLoading: boolean;
  isError: boolean;
  refetch: typeof mockRefetch;
};

const mockMutate = jest.fn();

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));
// Why requireMock 取 spy：jest.mock 工厂在 import 阶段（hoist 后）即执行，此时外部
// const mockToastInfo 尚未初始化（undefined 捕获进工厂→toast.info not a function，
// 20261114 实测）；工厂内联 jest.fn()，测试侧经 requireMock 拿同一实例断言
const mockToastInfo = jest.requireMock('@/store/toastStore').toast.info as jest.Mock;

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/queries/usePromotion', () => ({
  useAvailableCoupons: () => mockAvailable,
  useClaimCoupon: () => ({
    mutate: mockMutate,
    isPending: false,
    variables: undefined,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const fakeCoupon = (id: string) => ({
  id,
  code: id.toUpperCase(),
  name: `Coupon ${id}`,
  description: null,
  type: 'FIXED_AMOUNT' as const,
  value: 5,
  minOrderAmount: 20,
  maxDiscountAmount: null,
  startAt: '2026-08-01T00:00:00Z',
  endAt: '2026-09-01T00:00:00Z',
  status: 'available' as const,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAvailable = { data: [], isLoading: false, isError: false, refetch: mockRefetch };
});

describe('CouponClaimPage', () => {
  it('渲染页面标题 + 我的卡包入口', () => {
    const { getByText } = render(<ClaimPage />, { wrapper });
    expect(getByText('claim.title')).toBeTruthy();
    expect(getByText('claim.goMyCoupons')).toBeTruthy();
  });

  it('空列表渲染空态文案', () => {
    const { getByText } = render(<ClaimPage />, { wrapper });
    expect(getByText('claim.empty')).toBeTruthy();
    expect(getByText('claim.emptyDesc')).toBeTruthy();
  });

  it('列表渲染可领卡 + 领取按钮 onPress 触发 mutate(promotionId)', () => {
    mockAvailable.data = [fakeCoupon('promo-1'), fakeCoupon('promo-2')];
    const { getByText, getAllByText } = render(<ClaimPage />, { wrapper });
    expect(getByText('Coupon promo-1')).toBeTruthy();
    expect(getByText('Coupon promo-2')).toBeTruthy();
    // 两卡各一个「领取」按钮，取第一个（FlatList 首项 = promo-1）
    fireEvent.press(getAllByText('claim.claimBtn')[0]);
    expect(mockMutate).toHaveBeenCalledWith(
      'promo-1',
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('error 态渲染 ErrorState + 重试触发 refetch', () => {
    mockAvailable.isError = true;
    const { getByText } = render(<ClaimPage />, { wrapper });
    fireEvent.press(getByText('common.retry'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  // 20261114 邀请好友入口卡（迁自 profile 发现宫格）：三态之外恒渲染 + 占位 toast
  it('邀请好友入口卡：loading/错误/空态下仍渲染，点击弹 featureComingSoon toast', () => {
    const { getByTestId } = render(<ClaimPage />, { wrapper });
    expect(getByTestId('claim-invite-entry')).toBeTruthy();
    fireEvent.press(getByTestId('claim-invite-entry'));
    expect(mockToastInfo).toHaveBeenCalledWith('profile.featureComingSoon');
  });
});
