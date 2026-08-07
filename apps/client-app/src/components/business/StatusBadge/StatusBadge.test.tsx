import React from 'react';
import { render } from '@testing-library/react-native';

import { StatusBadge } from './StatusBadge';

// Why: StatusBadge a11y 标签走 i18n（order.statusBadgeA11y 模板插值），mock t 做简单插值
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const templates: Record<string, string> = { 'order.statusBadgeA11y': 'Status: {{status}}' };
      let s = templates[key] ?? key;
      if (opts) {
        Object.keys(opts).forEach((k) => {
          s = s.replace(new RegExp(`{{${k}}}`, 'g'), String(opts[k]));
        });
      }
      return s;
    },
  }),
}));

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
