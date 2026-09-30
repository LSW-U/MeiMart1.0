/**
 * C-P2-11: 单一共享 ticker——TickerProvider 全局 1 个 setInterval，
 * 挂载 N 个倒计时 NotificationItem 不再各自起 timer（原 N 项 = N setInterval）。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { NotificationItem, TickerProvider } from './NotificationItem';
import type { Notification } from '@/types';

jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-09-30T12:00:00Z').getTime());

const makePromo = (id: string): Notification => ({
  id,
  title: `Promo ${id}`,
  body: 'Ends soon',
  type: 'promotion',
  read: true,
  createdAt: '2026-09-30T00:00:00Z',
  data: { endsAt: '2026-09-30T13:00:00Z' },
});

describe('C-P2-11 单一共享 ticker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('挂载 5 个倒计时项，全局 setInterval 仅被调用 1 次（TickerProvider 心跳）', () => {
    const spy = jest.spyOn(globalThis, 'setInterval');
    render(
      <TickerProvider>
        {['a', 'b', 'c', 'd', 'e'].map((id) => (
          <NotificationItem key={id} notification={makePromo(id)} />
        ))}
      </TickerProvider>,
      { wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider> },
    );
    // TickerProvider 1 次；各倒计时项零 setInterval
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toBe(1000);
  });

  it('不包 Provider 的普通项不产生 setInterval（零定时器）', () => {
    const spy = jest.spyOn(globalThis, 'setInterval');
    render(<NotificationItem notification={makePromo('solo')} />, {
      wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
