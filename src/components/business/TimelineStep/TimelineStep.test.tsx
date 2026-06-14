import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { TimelineStep } from './TimelineStep';
import type { TrackingStep } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const steps: TrackingStep[] = [
  {
    status: 'Order Placed',
    description: 'We received your order',
    timestamp: '2026-01-01T00:00:00Z',
    location: 'Dili',
  },
  { status: 'Paid', description: 'Payment confirmed', timestamp: '2026-01-01T01:00:00Z' },
  { status: 'Shipped', description: 'On the way', timestamp: '2026-01-02T00:00:00Z' },
];

describe('TimelineStep', () => {
  it('renders all step statuses', () => {
    const { getByText } = render(<TimelineStep steps={steps} />, { wrapper });
    expect(getByText('Order Placed')).toBeTruthy();
    expect(getByText('Paid')).toBeTruthy();
    expect(getByText('Shipped')).toBeTruthy();
  });
});
