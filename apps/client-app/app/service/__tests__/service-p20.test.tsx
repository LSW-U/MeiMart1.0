import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
// router mock 句柄（断言 push 实参用；jest.mock hoist 保证拿到的是 mock 版）
import { router } from 'expo-router';
import CustomerServicePage from '../index';

// P20 页面测试：快捷入口 / Contact 卡 / FAQ 折叠（结构 + 交互）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('CustomerServicePage（P20：快捷入口 + Contact 卡 + FAQ 折叠）', () => {
  // Why: spy 在 beforeAll 建（模块加载完成后），引用存局部变量供断言
  let linkingOpenURL: ReturnType<typeof jest.spyOn>;

  beforeAll(() => {
    const { Linking } = jest.requireActual('react-native');
    // Why: mockImplementation 必须返回 Promise（openExternalLink 内会 .catch）
    linkingOpenURL = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
  });

  it('渲染 3 个快捷入口（orders/refunds/tracking）', () => {
    const { getByTestId } = render(<CustomerServicePage />, { wrapper });
    expect(getByTestId('cs-shortcut-orders')).toBeTruthy();
    expect(getByTestId('cs-shortcut-refunds')).toBeTruthy();
    expect(getByTestId('cs-shortcut-tracking')).toBeTruthy();
  });

  it('审查 Q1 回归：tracking 快捷入口路由指向订单列表（非无 id 的 /order/tracking）', () => {
    const { getByTestId } = render(<CustomerServicePage />, { wrapper });
    fireEvent.press(getByTestId('cs-shortcut-tracking'));
    // Why: '/order/tracking' 无 id 必落 ErrorState（useOrder enabled 守卫），改由订单列表选择
    expect(router.push).toHaveBeenCalledWith('/(main)/orders');
  });

  it('Contact 卡：online 主行 + phone/email 副行，phone 可点拉起 tel:', () => {
    const { getByTestId } = render(<CustomerServicePage />, { wrapper });
    expect(getByTestId('cs-contact-online')).toBeTruthy();
    fireEvent.press(getByTestId('cs-contact-phone'));
    expect(linkingOpenURL).toHaveBeenCalledWith('tel:+67077000000');
    fireEvent.press(getByTestId('cs-contact-email'));
    expect(linkingOpenURL).toHaveBeenCalledWith('mailto:support@meimart.tl');
  });

  it('FAQ 折叠：默认收起，点 q1 展开（expanded a11y + 答案出现），再点收起', () => {
    const { getByTestId, queryByText } = render(<CustomerServicePage />, { wrapper });
    // 默认全部收起（答案 key 不渲染）
    expect(queryByText('service.help.faq.a1')).toBeNull();
    const q1 = getByTestId('cs-faq-q1');
    expect(q1.props.accessibilityState?.expanded).toBeFalsy();
    // 点开
    fireEvent.press(q1);
    expect(queryByText('service.help.faq.a1')).toBeTruthy();
    expect(getByTestId('cs-faq-q1').props.accessibilityState?.expanded).toBe(true);
    // 再点收起
    fireEvent.press(getByTestId('cs-faq-q1'));
    expect(queryByText('service.help.faq.a1')).toBeNull();
  });

  it('FAQ 共 4 条（复用 help q1-q4）+ All topics 入口存在', () => {
    const { getByTestId } = render(<CustomerServicePage />, { wrapper });
    ['q1', 'q2', 'q3', 'q4'].forEach((id) => {
      expect(getByTestId(`cs-faq-${id}`)).toBeTruthy();
    });
    expect(getByTestId('cs-faq-all')).toBeTruthy();
  });
});
