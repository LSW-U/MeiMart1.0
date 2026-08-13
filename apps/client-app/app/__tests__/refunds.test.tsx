/**
 * RefundsListPage 基础渲染测试（规则 8：每个页面必须有基础测试）
 *
 * 放 app 下 __tests__ 目录（非 app 括号子目录）：jest testMatch 的 micromatch
 * 把括号目录名当 extglob 语法，括号路径不匹配测试发现规则。
 *
 * mock 外部 service/hook + ThemeProvider 包裹（after-sales-apply.test 模式）。
 * jest.setup 已 mock safe-area-context / netinfo / vector-icons / async-storage。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import RefundsPage from '../(main)/refunds';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

jest.mock('@/hooks/useWeakNetworkUI', () => ({
  useWeakNetworkUI: () => ({ isOffline: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// 默认返空列表（测空态）
jest.mock('@/services/queries/useRefunds', () => ({
  useRefunds: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('RefundsPage', () => {
  it('渲染页面标题 + 状态筛选 tab', () => {
    const { getByText } = render(<RefundsPage />, { wrapper });
    expect(getByText('refunds.title')).toBeTruthy();
    expect(getByText('refunds.tabAll')).toBeTruthy();
    expect(getByText('refunds.tabInProgress')).toBeTruthy();
    expect(getByText('refunds.tabDone')).toBeTruthy();
  });

  it('空列表渲染空态文案 + 去逛逛入口', () => {
    const { getByText } = render(<RefundsPage />, { wrapper });
    expect(getByText('refunds.empty')).toBeTruthy();
    expect(getByText('refunds.goOrders')).toBeTruthy();
  });
});
