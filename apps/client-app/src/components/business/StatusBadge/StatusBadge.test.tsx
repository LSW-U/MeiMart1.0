import React from 'react';
import { render } from '@testing-library/react-native';

import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the given text', () => {
    const { getByText } = render(<StatusBadge text="PROCESSING" backgroundColor="#F97316" />);
    expect(getByText('PROCESSING')).toBeTruthy();
  });

  it('forwards testID', () => {
    const { getByTestId } = render(
      <StatusBadge text="SHIPPED" backgroundColor="#F97316" testID="order-status-badge" />,
    );
    expect(getByTestId('order-status-badge')).toBeTruthy();
  });

  it('exposes Status: <text> as accessibilityLabel', () => {
    const { getByLabelText } = render(<StatusBadge text="DELIVERED" backgroundColor="#059669" />);
    expect(getByLabelText('Status: DELIVERED')).toBeTruthy();
  });
});
