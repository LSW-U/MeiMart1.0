import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { BannerCarousel } from './BannerCarousel';
import type { Banner } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const banners: Banner[] = [
  { id: 'b1', image: 'https://example.com/1.jpg', title: 'Sale' },
  { id: 'b2', image: 'https://example.com/2.jpg', title: 'New Arrivals' },
];

jest.mock('../../utils/dimensions', () => ({}), { virtual: true });

describe('BannerCarousel', () => {
  it('renders all banner titles', () => {
    const { getByText } = render(<BannerCarousel banners={banners} autoPlay={false} />, {
      wrapper,
    });
    expect(getByText('Sale')).toBeTruthy();
    expect(getByText('New Arrivals')).toBeTruthy();
  });

  it('renders dots equal to banners', () => {
    const { getByTestId } = render(<BannerCarousel banners={banners} autoPlay={false} />, {
      wrapper,
    });
    expect(getByTestId('dot-0')).toBeTruthy();
    expect(getByTestId('dot-1')).toBeTruthy();
  });

  it('renders nothing for empty banners', () => {
    const { toJSON } = render(<BannerCarousel banners={[]} />, { wrapper });
    expect(toJSON()).toBeNull();
  });
});

export { Text };
