import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderCard } from './OrderCard';
import type { Order } from '@/types';

// labelKey i18n 化（批B orderStatusConfig）后 t() 必须可用：mock 返回映射文案
// （ProductCard.test/refunds.test 模式）；key 拼错或 locales 丢 key 时回落 key 字面量，断言直接红
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          'order.statusLabels.PENDING_PAYMENT': 'Pending Payment',
          'order.actionLabels.cancelOrder': 'Cancel',
          'order.actionLabels.payNow': 'Pay Now',
          'order.total': 'Order total',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const order: Order = {
  id: 'o1',
  orderNo: 'ORD-20240101-0001',
  status: 'PENDING_PAYMENT',
  items: [
    {
      id: 'c1',
      product: {
        id: 'p1',
        name: {
          zh: '有机野蜂蜜',
          en: 'Organic Wild Honey',
          tet: 'Fuan Mensak',
          pt: 'Mel Silvestre Orgânico',
        },
        price: 18.5,
        image: 'https://example.com/h.jpg',
        category: 'food',
      },
      quantity: 2,
      selected: true,
    },
  ],
  totalPrice: 37,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('OrderCard', () => {
  it('renders order number, status, total', () => {
    const { getByText } = render(<OrderCard order={order} />, { wrapper });
    expect(getByText('#ORD-20240101-0001')).toBeTruthy();
    expect(getByText('Pending Payment')).toBeTruthy();
    expect(getByText('$37.00')).toBeTruthy();
  });

  it('renders Pay Now and Cancel actions for pending status', () => {
    const onAction = jest.fn();
    const { getByText } = render(<OrderCard order={order} onAction={onAction} />, {
      wrapper,
    });
    fireEvent.press(getByText('Pay Now'));
    expect(onAction).toHaveBeenCalledWith('pay', order);
  });
});
