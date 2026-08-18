// P21 帮助中心页测试：分类过滤 / 搜索过滤（含空态）/ FAQ 折叠 / 联系 CTA 跳转
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
// router mock 句柄（断言 push 实参用；jest.mock hoist 保证拿到的是 mock 版）
import { router } from 'expo-router';
import HelpCenterPage from '../help';

// Why: mock t 直返 key（结构断言）；faq.q2 返回值夹 "payment" 让搜索匹配逻辑可测
//      （页面用 t() 返回值做 includes 过滤，纯 key 返回会让所有搜索都空结果）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { query?: string; count?: number }) => {
      if (opts?.query !== undefined || opts?.count !== undefined) {
        return `${key}:${opts.query ?? ''}:${opts.count ?? ''}`;
      }
      if (key === 'service.help.faq.q2') return 'What payment methods are supported?';
      if (key === 'service.help.faq.a2') return 'WeChat Pay, Alipay, cash on delivery.';
      return key;
    },
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

describe('HelpCenterPage（P21：分类过滤 + 搜索 + 一体化列表）', () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
  });

  it('默认渲染 All chip 选中 + 全量 5 条 FAQ + All FAQs 标题', () => {
    const { getByTestId, queryByTestId } = render(<HelpCenterPage />, { wrapper });
    expect(getByTestId('help-cat-all').props.accessibilityState?.selected).toBe(true);
    ['q1', 'q2', 'q3', 'q4', 'q5'].forEach((id) => {
      expect(getByTestId(`faq-${id}`)).toBeTruthy();
    });
    // 非 all 分类时才显示 clear filter
    expect(queryByTestId('help-clear-filter')).toBeNull();
  });

  it('D1/D6 分类过滤：点 Shipping 只显示 q4，Clear filter 回到全量', () => {
    const { getByTestId, queryByTestId } = render(<HelpCenterPage />, { wrapper });
    fireEvent.press(getByTestId('help-cat-shipping'));
    expect(getByTestId('help-cat-shipping').props.accessibilityState?.selected).toBe(true);
    expect(queryByTestId('faq-q4')).toBeTruthy();
    ['q1', 'q2', 'q3', 'q5'].forEach((id) => {
      expect(queryByTestId(`faq-${id}`)).toBeNull();
    });
    // Clear filter 出现且点击回 all
    fireEvent.press(getByTestId('help-clear-filter'));
    expect(getByTestId('help-cat-all').props.accessibilityState?.selected).toBe(true);
    expect(queryByTestId('faq-q1')).toBeTruthy();
    expect(queryByTestId('help-clear-filter')).toBeNull();
  });

  it('D3 搜索过滤：输入 payment 只匹配 q2（问题文本匹配），分类区隐藏', () => {
    const { getByTestId, queryByTestId } = render(<HelpCenterPage />, { wrapper });
    fireEvent.changeText(getByTestId('help-search'), 'payment');
    // 分类 chip 行隐藏（搜索态）
    expect(queryByTestId('help-cat-all')).toBeNull();
    // mock t 直返 key：q2 问题含 "payment" → 匹配；其余 key 名不含 → 过滤掉
    expect(queryByTestId('faq-q2')).toBeTruthy();
    expect(queryByTestId('faq-q1')).toBeNull();
  });

  it('D3 搜索空态：无匹配时显示 noResult 空态', () => {
    const { getByTestId, getByText, queryByTestId } = render(<HelpCenterPage />, { wrapper });
    fireEvent.changeText(getByTestId('help-search'), 'zzz-not-exist');
    expect(queryByTestId('faq-q1')).toBeNull();
    expect(getByText('service.help.noResult')).toBeTruthy();
    expect(getByText('service.help.noResultDesc')).toBeTruthy();
  });

  it('D2 FAQ 折叠：默认 q1 展开，点 q2 切换单开手风琴', () => {
    const { getByTestId } = render(<HelpCenterPage />, { wrapper });
    expect(getByTestId('faq-q1').props.accessibilityState?.expanded).toBe(true);
    fireEvent.press(getByTestId('faq-q2'));
    expect(getByTestId('faq-q2').props.accessibilityState?.expanded).toBe(true);
    expect(getByTestId('faq-q1').props.accessibilityState?.expanded).toBeFalsy();
  });

  it('D4 联系 CTA 跳 /service/feedback（与 P20 对齐）', () => {
    const { getByTestId } = render(<HelpCenterPage />, { wrapper });
    fireEvent.press(getByTestId('help-contact-cs'));
    expect(router.push).toHaveBeenCalledWith('/service/feedback');
  });
});
