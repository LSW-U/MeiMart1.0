import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderTimelineCard } from './OrderTimelineCard';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const steps = [
  { status: 'Submitted', description: 'Order placed', timestamp: '2026-06-01 10:30' },
  { status: 'Paid', description: 'Payment confirmed', timestamp: '2026-06-01 11:00' },
];

describe('OrderTimelineCard', () => {
  it('renders title and first step status', () => {
    const { getByText } = render(<OrderTimelineCard steps={steps} currentIndex={1} />, {
      wrapper,
    });
    expect(getByText('Submitted')).toBeTruthy();
    expect(getByText('Paid')).toBeTruthy();
  });
});
