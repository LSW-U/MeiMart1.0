import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { ReviewItem } from './ReviewItem';
import type { Review } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const review: Review = {
  id: 'r1',
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
});
