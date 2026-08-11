/**
 * P13 售后申请页基础渲染测试（规则8：每个组件必须有基础测试）
 *
 * Q2 修复：jest.setup 加 safe-area-context + netinfo mock（页面测试基建），
 * 测试文件 mock 外部 service/hook + ThemeProvider 包裹（LogoBadge 模式）。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import AfterSalesApplyPage from '../after-sales-apply';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ orderId: 'o001' }),
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: false, isConnected: true, isWeak: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/i18n', () => ({
  useLocalizer: () => (text: { en?: string }) => text?.en ?? '',
}));

jest.mock('@/services/queries/useOrders', () => {
  // 稳定的 mock order（模块级，避免每次 render 返新对象触发 useEffect deps[order] 循环 -> OOM）
  const mockOrder = {
    id: 'o001',
    items: [
      {
        id: 'oi1',
        quantity: 2,
        product: {
          id: 'p1',
          name: { en: 'Apple', zh: '苹果', tet: 'Apple' },
          price: 500,
          image: 'https://example.com/apple.jpg',
        },
      },
    ],
    totalPrice: 1000,
    status: 'CONFIRMED',
  };
  return {
    useOrder: () => ({
      data: mockOrder,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
  };
});

jest.mock('@/services/queries/useRefunds', () => ({
  useCreateRefund: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/services/uploads', () => ({
  uploadsApi: { refundEvidence: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/utils/format', () => ({
  formatDate: (iso: string) => iso,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('AfterSalesApplyPage', () => {
  it('renders without crash + 标题渲染（afterSales.applyTitle）', () => {
    const { getByText } = render(<AfterSalesApplyPage />, { wrapper });
    expect(getByText('afterSales.applyTitle')).toBeTruthy();
  });

  it('photoAddBtn 渲染 + a11y label（afterSales.addPhotoA11y）', () => {
    const { getByLabelText } = render(<AfterSalesApplyPage />, { wrapper });
    expect(getByLabelText('afterSales.addPhotoA11y')).toBeTruthy();
  });
});
