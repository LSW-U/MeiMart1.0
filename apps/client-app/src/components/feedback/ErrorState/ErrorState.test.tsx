import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ErrorState } from './ErrorState';

// T2-B: retryLabel 兜底改走 t('common.retry')，mock i18n 返回 key（refunds.test 模式）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ErrorState', () => {
  it('renders error message', () => {
    const { getByText } = render(<ErrorState message="Network error" />, { wrapper });
    expect(getByText('Network error')).toBeTruthy();
  });

  it('calls onRetry when retry pressed（兜底文案走 common.retry i18n key）', () => {
    const onRetry = jest.fn();
    const { getByText } = render(<ErrorState message="Error" onRetry={onRetry} />, { wrapper });
    fireEvent.press(getByText('common.retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('显式 retryLabel 优先于 i18n 兜底', () => {
    const { getByText, queryByText } = render(
      <ErrorState message="Error" onRetry={jest.fn()} retryLabel="Go login" />,
      { wrapper },
    );
    expect(getByText('Go login')).toBeTruthy();
    expect(queryByText('common.retry')).toBeNull();
  });
});
