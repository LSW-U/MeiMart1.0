/**
 * 地址列表页（app/address/list.tsx）—— B6 体验完善测试
 *
 * 覆盖：频次排序（desc + 同频稳定）/ 折叠默认 3 条 + 展开/收起 / 选择模式回传不受影响。
 * 放 app/__tests__/（非 app/address/__tests__）：jest testMatch 的 micromatch
 * 把嵌套路由目录名当特殊语法（同 address-edit.test.tsx 注释）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { useFrequentAddressStore } from '@/store/frequentAddressStore';
import ListPage from '../address/list';

let mockAddresses: { data?: unknown; isLoading: boolean } = { isLoading: false };
const mockSelect = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { back: (...a: unknown[]) => mockBack(...a), push: (...a: unknown[]) => mockPush(...a) },
  useLocalSearchParams: () => mockParams,
}));
let mockParams: { from?: string } = {};

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; defaultValue?: string }) =>
      key === 'address.showMore' && opts?.count != null ? `${key}:${opts.count}` : key,
  }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => mockAddresses,
  useDeleteAddress: () => ({ mutate: jest.fn(), isPending: false }),
  useSetDefaultAddress: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/store/addressSelectionStore', () => ({
  useAddressSelectionStore: () => mockSelect,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// 6 个地址：a1..a6 原序；isDefault 标在 a4（若排序不生效，折叠前 5 条 = a1..a5）
const makeAddr = (id: string, isDefault = false) => ({
  id,
  name: `Name ${id}`,
  phone: '77123456',
  province: 'Dili',
  city: 'Dili',
  district: 'Vera Cruz',
  detail: `Rua ${id}`,
  isDefault,
  tag: null,
});

beforeEach(() => {
  mockSelect.mockClear();
  mockBack.mockClear();
  mockPush.mockClear();
  mockParams = {};
  mockAddresses = {
    data: [
      makeAddr('a1'),
      makeAddr('a2'),
      makeAddr('a3'),
      makeAddr('a4', true),
      makeAddr('a5'),
      makeAddr('a6'),
    ],
    isLoading: false,
  };
  useFrequentAddressStore.setState({ counts: {} });
});

const nameText = (id: string) => `Name ${id}`;

describe('AddressListPage B6 频次排序', () => {
  it('频次 desc：高频地址排进折叠前 5 条（覆盖 isDefault 的 a4）', () => {
    useFrequentAddressStore.setState({ counts: { a5: 3, a4: 2 } });
    const { getByText, queryByText } = render(<ListPage />, { wrapper });
    // 前 5 条应为 a5(3) > a4(2) > a1(0) > a2 > a3；a6 折叠
    expect(getByText(nameText('a5'))).toBeTruthy();
    expect(getByText(nameText('a4'))).toBeTruthy();
    expect(getByText(nameText('a1'))).toBeTruthy();
    expect(getByText(nameText('a2'))).toBeTruthy();
    expect(getByText(nameText('a3'))).toBeTruthy();
    expect(queryByText(nameText('a6'))).toBeNull();
  });

  it('频次相同保持原序：多条同频进折叠区，展开前渲染顺序 = 原序 a1..a5', () => {
    useFrequentAddressStore.setState({ counts: { a1: 2, a2: 2, a3: 2 } });
    const { toJSON } = render(<ListPage />, { wrapper });
    // 前 5 条（同频 a1..a3 > a4/a5，原序）都在折叠区，名称出现顺序必须保持原序
    const tree = JSON.stringify(toJSON());
    const positions = ['Name a1', 'Name a2', 'Name a3', 'Name a4', 'Name a5'].map((n) =>
      tree.indexOf(n),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    for (let i = 0; i < positions.length - 1; i++) {
      expect(positions[i]!).toBeLessThan(positions[i + 1]!);
    }
  });

  it('无频次记录 → isDefault 优先：a4（默认）进前 5，a6 折叠', () => {
    const { getByText, queryByText } = render(<ListPage />, { wrapper });
    expect(getByText(nameText('a4'))).toBeTruthy();
    expect(queryByText(nameText('a6'))).toBeNull();
  });
});

describe('AddressListPage B6 折叠/展开', () => {
  it('默认折叠：只渲染 5 条 + 「显示更多 (1)」，剩余 1 条不渲染', () => {
    const { getByText, queryByText } = render(<ListPage />, { wrapper });
    // 无频次记录 → isDefault 优先：a4 排第一，折叠前 5 = a4,a1,a2,a3,a5；a6 收起
    expect(getByText(nameText('a4'))).toBeTruthy();
    expect(getByText(nameText('a1'))).toBeTruthy();
    expect(getByText(nameText('a2'))).toBeTruthy();
    expect(getByText(nameText('a3'))).toBeTruthy();
    expect(getByText(nameText('a5'))).toBeTruthy();
    expect(queryByText(nameText('a6'))).toBeNull();
    expect(getByText('address.showMore:1')).toBeTruthy();
  });

  it('≤5 条时不显示折叠开关', () => {
    mockAddresses = {
      data: [makeAddr('a1'), makeAddr('a2'), makeAddr('a3'), makeAddr('a4'), makeAddr('a5')],
      isLoading: false,
    };
    const { queryByTestId } = render(<ListPage />, { wrapper });
    expect(queryByTestId('address-show-more')).toBeNull();
  });

  it('点击展开 → 6 条全显 + 按钮变「收起」；再点收起', () => {
    const { getByTestId, getByText, queryByText } = render(<ListPage />, { wrapper });
    fireEvent.press(getByTestId('address-show-more'));
    expect(getByText(nameText('a6'))).toBeTruthy();
    expect(getByText('address.showLess')).toBeTruthy();
    expect(queryByText('address.showMore:1')).toBeNull();
    // 再点收起
    fireEvent.press(getByTestId('address-show-more'));
    expect(queryByText(nameText('a6'))).toBeNull();
    expect(getByText('address.showMore:1')).toBeTruthy();
  });
});

describe('AddressListPage 选择模式回传（B6 不改语义）', () => {
  it("from='checkout'：点击折叠区内地址 → select + back（回传链路不受排序/折叠影响）", () => {
    mockParams = { from: 'checkout' };
    const { getByText } = render(<ListPage />, { wrapper });
    fireEvent.press(getByText(nameText('a2')));
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledWith('a2');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("from='checkout'：点击折叠区外地址（展开后可见 a6）→ 同样回传", () => {
    mockParams = { from: 'checkout' };
    const { getByTestId, getByText } = render(<ListPage />, { wrapper });
    fireEvent.press(getByTestId('address-show-more'));
    fireEvent.press(getByText(nameText('a6')));
    expect(mockSelect).toHaveBeenCalledWith('a6');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('选择模式下点击「显示更多」只展开不触发回传', () => {
    mockParams = { from: 'checkout' };
    const { getByTestId } = render(<ListPage />, { wrapper });
    fireEvent.press(getByTestId('address-show-more'));
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('管理模式点击地址 → 走设默认（不触发 select/back）', () => {
    const { getByText } = render(<ListPage />, { wrapper });
    fireEvent.press(getByText(nameText('a1')));
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
