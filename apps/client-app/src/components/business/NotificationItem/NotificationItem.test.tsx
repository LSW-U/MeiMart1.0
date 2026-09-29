import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '@/theme';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const notification: Notification = {
  id: 'n1',
  title: 'Order Delivered',
  body: 'Your order has been delivered successfully.',
  type: 'order',
  read: false,
  createdAt: '2026-01-01T00:00:00Z',
};

// 方案A 交互覆盖（nested Pressable 治理 review）：两处内层改造是行为语义改动，补回归断言。
// callRider 走 openExternalLink→Linking.openURL（utils/linking），顶层 spy 取证（先例：外层
// jest.spyOn 不拉真 NativeModules——jest.requireActual 在 jest-expo 下会崩）
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);

describe('NotificationItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and body', () => {
    const { getByText } = render(<NotificationItem notification={notification} />, { wrapper });
    expect(getByText('Order Delivered')).toBeTruthy();
    expect(getByText('Your order has been delivered successfully.')).toBeTruthy();
  });

  // 方案A: CTA 宿主从 Pressable 换 Text 直挂 onPress——回调通路不变，锁行为防回归
  it('CTA（promotion+productId）点击触发 onCta buyNow', () => {
    const onCta = jest.fn();
    const promo: Notification = {
      ...notification,
      id: 'n2',
      type: 'promotion',
      data: { productId: 'p1' },
    };
    const { getByText } = render(<NotificationItem notification={promo} onCta={onCta} />, {
      wrapper,
    });
    fireEvent.press(getByText(/service\.notifications\.cta\.buyNow/));
    expect(onCta).toHaveBeenCalledWith('buyNow', promo);
  });

  // 方案A + P3-1: callRider 改 View+responder，release 界内才拨号——
  // locationX/Y 界内→tel 链接；界外（拖出取消语义）→不拨
  describe('callRider（View+responder 界内判定）', () => {
    // Why: 骑手行外层条件是 (riderName || eta)，fixture 补 riderName 才渲染 callRider 钮
    const riderNotif: Notification = {
      ...notification,
      id: 'n3',
      data: { riderName: 'João', riderPhone: '+67077000000' },
    };

    it('release 在 32×32 界内：openURL tel 拨号', () => {
      const { getByLabelText } = render(<NotificationItem notification={riderNotif} />, {
        wrapper,
      });
      const btn = getByLabelText('service.notifications.cta.callRider');
      fireEvent(btn, 'responderRelease', {
        nativeEvent: { locationX: 16, locationY: 16 },
      });
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+67077000000');
    });

    it('release 拖出界外：不拨号（原 Pressable 拖出取消语义已补回）', () => {
      const { getByLabelText } = render(<NotificationItem notification={riderNotif} />, {
        wrapper,
      });
      const btn = getByLabelText('service.notifications.cta.callRider');
      fireEvent(btn, 'responderRelease', {
        nativeEvent: { locationX: 100, locationY: 16 },
      });
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });
});
