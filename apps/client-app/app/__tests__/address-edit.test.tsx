/**
 * 地址编辑页（app/address/edit.tsx）渲染 + 提交 payload 测试（审查 B1/Q1 防回归）
 *
 * 放 app 下 __tests__ 目录（非 app/address/__tests__）：jest testMatch 的
 * micromatch 把嵌套路由目录名当特殊语法，refunds/claim.test 同模式。
 *
 * mock 外部 service/hook + ThemeProvider 包裹 + i18n 返 key。
 * 核心断言：提交 payload 含 tag（B1）/ lat/lng 用地图选点（B3）——页面层拼装是分层交付高危点。
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { useMapPickStore } from '@/store/mapPickStore';
import EditPage from '../address/edit';

const mockMutate = jest.fn();

const fakeExisting = {
  id: 'a1',
  name: 'Maria Silva',
  phone: '77123456',
  province: 'Dili',
  city: 'Dili',
  district: 'Vera Cruz',
  detail: 'Rua de Lecidere',
  isDefault: false,
  lat: -8.55,
  lng: 125.56,
  tag: 'home',
};

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'a1' }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/queries/useAddress', () => ({
  useAddresses: () => ({ data: [fakeExisting] }),
  useCreateAddress: () => ({ mutate: mockMutate, isPending: false }),
  useUpdateAddress: () => ({ mutate: mockMutate, isPending: false }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockMutate.mockReset();
  useMapPickStore.getState().clear();
});

describe('AddressEditPage', () => {
  it('编辑已有地址：表单回填 existing 值', () => {
    const { getByDisplayValue, queryByTestId } = render(<EditPage />, { wrapper });
    expect(getByDisplayValue('Maria Silva')).toBeTruthy();
    expect(getByDisplayValue('77123456')).toBeTruthy();
    // 未去地图选点时不显示定位状态行
    expect(queryByTestId('addr-located')).toBeNull();
  });

  it('地图选点回传：detail 回填 + 定位状态行显示（决策 4/10）', async () => {
    useMapPickStore.getState().setPick({ lat: -8.5, lng: 125.5, address: 'Picked Rua X' });
    const { getByDisplayValue, getByTestId } = render(<EditPage />, { wrapper });
    await waitFor(() => {
      expect(getByDisplayValue('Picked Rua X')).toBeTruthy();
    });
    expect(getByTestId('addr-located')).toBeTruthy();
  });

  it('提交 payload 含 tag/lat/lng（B1 防回归：地图坐标优先于旧值）', async () => {
    useMapPickStore.getState().setPick({ lat: -8.5, lng: 125.5, address: 'Picked Rua X' });
    const { getByText } = render(<EditPage />, { wrapper });
    await waitFor(() => {
      expect(getByText('address.save')).toBeTruthy();
    });
    fireEvent.press(getByText('address.save'));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
    // 校验通过后 handleSubmit 才调 onSubmit —— 等到 mutate 被调即可断言 payload
    const [arg] = mockMutate.mock.calls[0];
    expect(arg.id).toBe('a1');
    expect(arg.updates).toMatchObject({
      tag: 'home', // 审查 B1：tag 必须进 payload
      detail: 'Picked Rua X', // 地图选点回填
      lat: -8.5, // 地图坐标优先（B3）
      lng: 125.5,
      name: 'Maria Silva',
    });
  });
});
