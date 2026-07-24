import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { useToastStore } from '@/store/toastStore';
import { ToastContainer } from './ToastContainer';

// ToastContainer 依赖 useSafeAreaInsets，mock 为固定值，避免 Provider 包裹
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ToastContainer', () => {
  beforeEach(() => {
    // toastStore 是模块级单例，每个用例前清空，避免互相污染
    useToastStore.setState({ toasts: [] });
  });

  it('renders nothing when no toasts', () => {
    const { toJSON } = render(<ToastContainer />, { wrapper });
    expect(toJSON()).toBeNull();
  });

  it('renders toast messages when present', () => {
    useToastStore.setState({
      toasts: [
        { id: 1, message: '保存成功', type: 'success', duration: 0 },
        { id: 2, message: '出错了', type: 'error', duration: 0 },
      ],
    });
    const { getByText } = render(<ToastContainer />, { wrapper });
    expect(getByText('保存成功')).toBeTruthy();
    expect(getByText('出错了')).toBeTruthy();
  });
});
