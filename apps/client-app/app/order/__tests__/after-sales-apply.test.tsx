/**
 * P13 售后申请页基础渲染测试（规则8：每个组件必须有基础测试）
 *
 * Q2 修复：jest.setup 加 safe-area-context + netinfo mock（页面测试基建），
 * 测试文件 mock 外部 service/hook + ThemeProvider 包裹（LogoBadge 模式）。
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import AfterSalesApplyPage, { REFUND_REASON_KEYS } from '../after-sales-apply';
import { REASON_KEY_TO_ENUM } from '@/services/refunds';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ orderId: 'o001' }),
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: false, isConnected: true, isWeak: false }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/i18n', () => ({
  useLocalizer: () => (text: { en?: string }) => text?.en ?? '',
}));

jest.mock('@/services/queries/useOrders', () => {
  // 稳定的 mock order（模块级，避免每次 render 返新对象触发 useEffect deps[order] 循环 -> OOM）
  const mockOrder = {
    id: 'o001',
    items: [
      {
        id: 'oi1',
        quantity: 2,
        product: {
          id: 'p1',
          name: { en: 'Apple', zh: '苹果', tet: 'Apple' },
          price: 500,
          image: 'https://example.com/apple.jpg',
        },
      },
    ],
    totalPrice: 1000,
    status: 'CONFIRMED',
  };
  return {
    useOrder: () => ({
      data: mockOrder,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
  };
});

jest.mock('@/services/queries/useRefunds', () => ({
  useCreateRefund: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/services/uploads', () => ({
  uploadsApi: { refundEvidence: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

jest.mock('@/utils/format', () => ({
  ...jest.requireActual('@/utils/format'), // C-P2-1: PriceText 现经 formatPriceUtil（utils/format），mock 需保留真实现
  formatDate: (iso: string) => iso,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('AfterSalesApplyPage', () => {
  it('renders without crash + 标题渲染（afterSales.applyTitle）', () => {
    const { getByText } = render(<AfterSalesApplyPage />, { wrapper });
    expect(getByText('afterSales.applyTitle')).toBeTruthy();
  });

  it('photoAddBtn 渲染 + a11y label（afterSales.addPhotoA11y）', () => {
    const { getByLabelText } = render(<AfterSalesApplyPage />, { wrapper });
    expect(getByLabelText('afterSales.addPhotoA11y')).toBeTruthy();
  });
});

// B 部分（批4 假绿测试改造）：申请页可提交 reason 与后端 enum 映射同源自证对账——
// 逐 key 断言 REASON_KEY_TO_ENUM 有映射且指向真实 RefundReason enum 值，
// 并列出 locales 中已存在但申请页未映射的 reason key（当前 5 个有意收窄，
// 其余为 detail 页展示用 / 备用；映射扩面时本测试自动暴露遗漏）。
describe('售后 reason i18n key ↔ 后端 enum 同源自证', () => {
  it('REFUND_REASON_KEYS 每项都有 REASON_KEY_TO_ENUM 映射且值为合法 enum', () => {
    const legalEnums = new Set([
      'EXPIRED',
      'QUALITY_ISSUE',
      'WRONG_ITEM',
      'SHORTAGE',
      'DAMAGED',
      'OUT_OF_STOCK',
      'DELIVERY_TOO_SLOW',
      'CUSTOMER_CHANGE_MIND',
      'OTHER',
    ]);
    for (const key of REFUND_REASON_KEYS) {
      const mapped = REASON_KEY_TO_ENUM[key];
      expect(mapped).toBeDefined();
      expect(legalEnums.has(mapped)).toBe(true);
    }
  });

  it('locales 四语 afterSales.reasons 全 key 清单：申请页未映射项如实列出（不改行为，仅对账留痕）', () => {
    const en = require('../../../locales/en.json');
    const allKeys = Object.keys(en.afterSales.reasons);
    const unmapped = allKeys.filter(
      (k: string) => !(`afterSales.reasons.${k}` in REASON_KEY_TO_ENUM),
    );
    // 当前实况（申请页只开放 5 项）：qualityIssue/outOfStock/deliveryTooSlow/changeMind/other 未映射
    expect([...unmapped].sort()).toEqual(
      ['changeMind', 'deliveryTooSlow', 'other', 'outOfStock', 'qualityIssue'].sort(),
    );
  });
});
