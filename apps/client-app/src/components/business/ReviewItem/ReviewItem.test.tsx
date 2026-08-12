import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ReviewItem } from './ReviewItem';
import type { Review } from '@/types';

// jest hoist 到 import 前：mock useTranslation，anonymousDisplayName 返 Anonymous（其余返 key）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'review.anonymousDisplayName' ? 'Anonymous' : key),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const review: Review = {
  id: 'r1',
  productId: 'p001',
  userId: 'u1',
  userName: 'Alice',
  rating: 4,
  content: 'Great product, highly recommend!',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('ReviewItem', () => {
  it('renders user name and content', () => {
    const { getByText } = render(<ReviewItem review={review} />, { wrapper });
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Great product, highly recommend!')).toBeTruthy();
  });

  it('anonymous=true 显示「Anonymous」+ avatar「?」，不显示真实 userName（收尾 C）', () => {
    const { getByText, queryByText } = render(
      <ReviewItem review={{ ...review, anonymous: true }} />,
      { wrapper },
    );
    expect(getByText('Anonymous')).toBeTruthy();
    expect(getByText('?')).toBeTruthy();
    // 隐私：不显示真实 userName
    expect(queryByText('Alice')).toBeNull();
  });

  it('anonymous=false（或 undefined）显示真实 userName + 首字母', () => {
    const { getByText } = render(
      <ReviewItem review={{ ...review, anonymous: false }} />,
      { wrapper },
    );
    expect(getByText('Alice')).toBeTruthy();
    // avatar 首字母 = Alice[0] = A
    expect(getByText('A')).toBeTruthy();
  });
});
