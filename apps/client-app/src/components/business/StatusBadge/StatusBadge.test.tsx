import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Svg } from 'react-native-svg';

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

// 审查批A判断题3：P0-1 动态宽度守卫逻辑补测（MIN_W=92 下限 + onLayout 实测撑开取整）
describe('StatusBadge 动态宽度（P0-1）', () => {
  it('未测量时 Svg 宽度取下限 92', () => {
    const { UNSAFE_getByType } = render(<StatusBadge text="PAID" backgroundColor="#059669" />);
    expect(UNSAFE_getByType(Svg).props.width).toBe(92);
  });

  it('长文案 onLayout 实测宽撑开 Svg（向上取整）', () => {
    const { UNSAFE_getByType } = render(
      <StatusBadge text="ENTREGA TIHA ONA (PAGA IHA FATIN)" backgroundColor="#059669" />,
    );
    fireEvent(UNSAFE_getByType(Text), 'onLayout', {
      nativeEvent: { layout: { width: 189.6 } },
    });
    expect(UNSAFE_getByType(Svg).props.width).toBe(190);
  });

  it('实测宽低于下限时钳制 92 不缩', () => {
    const { UNSAFE_getByType } = render(<StatusBadge text="PAID" backgroundColor="#059669" />);
    fireEvent(UNSAFE_getByType(Text), 'onLayout', {
      nativeEvent: { layout: { width: 60 } },
    });
    expect(UNSAFE_getByType(Svg).props.width).toBe(92);
  });
});
