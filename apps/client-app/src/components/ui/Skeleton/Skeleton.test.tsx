import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Skeleton } from './Skeleton';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Skeleton', () => {
  it('renders with default size', () => {
    const { getByLabelText } = render(<Skeleton />, { wrapper });
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('renders text variant with small radius', () => {
    const { getByLabelText } = render(<Skeleton variant="text" width={120} height={14} />, {
      wrapper,
    });
    const el = getByLabelText('Loading');
    expect(el.props.style.borderRadius).toBe(2);
  });

  it('renders circle variant with full radius', () => {
    const { getByLabelText } = render(<Skeleton variant="circle" width={48} height={48} />, {
      wrapper,
    });
    const el = getByLabelText('Loading');
    expect(el.props.style.borderRadius).toBe(9999);
  });
});
