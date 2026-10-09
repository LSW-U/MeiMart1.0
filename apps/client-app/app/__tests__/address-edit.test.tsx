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
const mockTextGeocode = jest.fn();
// N-P1-3：可控的 useAddresses 返回（isLoading / data 空态切换）；
// 初值在 fakeExisting 声明后的 beforeEach 里设置，此处仅占位
let mockAddresses: { data?: unknown; isLoading: boolean } = { isLoading: false };

jest.mock('@/services/geocode', () => ({
  ...jest.requireActual('@/services/geocode'),
  textGeocode: (...args: unknown[]) => mockTextGeocode(...args),
}));

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
  useAddresses: () => mockAddresses,
  useCreateAddress: () => ({ mutate: mockMutate, isPending: false }),
  useUpdateAddress: () => ({ mutate: mockMutate, isPending: false }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

beforeEach(() => {
  mockMutate.mockReset();
  mockTextGeocode.mockReset();
  mockAddresses = { data: [fakeExisting], isLoading: false };
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

// ── 批1 T5（D1/D9）：文本转坐标防抖 + 回填 + fallback 不回填 + C-P2-15 守卫 ──
// Why 不用 fake timers：RNTL waitFor / RHF 内部定时器与 jest fake timers 冲突会挂死
//（advanceTimersByTime 后 jest 仍持有 pending timer，waitFor 永不满足）。改真实定时器，
// 防抖 1.2s 用 waitFor timeout 3s 承接；防抖阈值本身由 service 层常量保证，不在此重复断言。

describe('AddressEditPage 批1 T5 文本转坐标', () => {
  it('链路：文本输入 → textGeocode 命中 → 下拉选点回填坐标 → 提交 payload 带坐标', async () => {
    mockTextGeocode.mockResolvedValue({
      // Why 坐标偏移 0.0001：isDiliDefaultCoords 精确匹配 DILI 常量（-8.5569,125.5603），
      // 完全相同值会被 C-P2-15 守卫当默认视野拦截。真实 Nominatim 命中也不会恰为该点
      lat: -8.5568,
      lng: 125.5602,
      source: 'nominatim',
      formattedAddress: 'Rua de Lecidere, Dili, Timor-Leste',
    });
    const { getByTestId, getByText, queryByTestId } = render(<EditPage />, { wrapper });
    // 编辑页详情初值 'Rua de Lecidere'——重输触发防抖（onChangeText 通道）
    fireEvent.changeText(getByTestId('addr-detail'), 'Rua de Lecidere, Dili');
    // 防抖 1.2s 后调 textGeocode（waitFor 轮询真实定时器）
    await waitFor(
      () => {
        expect(mockTextGeocode).toHaveBeenCalledWith('Rua de Lecidere, Dili');
      },
      { timeout: 4000 },
    );
    // 命中后出现下拉结果，点击选点 → setPick 回填（同地图选点通道）→ located 行出现
    const hit = await waitFor(() => getByTestId('addr-geo-hit'), { timeout: 4000 });
    expect(hit).toBeTruthy();
    fireEvent.press(getByText('Rua de Lecidere, Dili, Timor-Leste'));
    await waitFor(() => {
      expect(queryByTestId('addr-located')).toBeTruthy();
    });
    expect(useMapPickStore.getState().pick).toMatchObject({ lat: -8.5568, lng: 125.5602 });
    // 提交 → payload 带文本转出的坐标
    fireEvent.press(getByText('address.save'));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
    const [arg] = mockMutate.mock.calls[0];
    expect(arg.updates.lat).toBe(-8.5568);
    expect(arg.updates.lng).toBe(125.5602);
  }, 15000);

  it('source=fallback → 不回填坐标（无下拉/无 located 行，setPick 未被调）', async () => {
    mockTextGeocode.mockResolvedValue({
      lat: -8.5567,
      lng: 125.5595,
      source: 'fallback',
      formattedAddress: null,
    });
    const { getByTestId, queryByTestId } = render(<EditPage />, { wrapper });
    fireEvent.changeText(getByTestId('addr-detail'), 'somewhere unknown');
    await waitFor(
      () => {
        expect(mockTextGeocode).toHaveBeenCalled();
      },
      { timeout: 4000 },
    );
    // textGeocode resolve 后下拉与定位状态均不出现，mapPickStore 无 pick（不回填）
    await waitFor(() => {
      expect(queryByTestId('addr-geo-hit')).toBeNull();
    });
    expect(queryByTestId('addr-located')).toBeNull();
    expect(useMapPickStore.getState().pick).toBeNull();
  }, 15000);

  it('编辑态无新定位提交 → 沿用旧坐标保存（守卫只拦「无任何合法坐标」）', async () => {
    const { getByText } = render(<EditPage />, { wrapper });
    fireEvent.press(getByText('address.save'));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
    // existing.lat=-8.55 合法 → 守卫放行，payload 带旧坐标
    const [arg] = mockMutate.mock.calls[0];
    expect(arg.updates.lat).toBe(-8.55);
  });

  it('新增态无任何坐标 → 提交被拦（C-P2-15 守卫不放宽，mutate 0 次）', async () => {
    // 新增态：useLocalSearchParams 无 id → existing undefined → 无旧坐标；无 pick → 守卫拦截
    const { getByText } = render(<EditPage />, { wrapper });
    fireEvent.press(getByText('address.save'));
    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});

// ── 第三轮新增代码修复 批1（N-P1-3）：编辑态健壮性 ──
describe('AddressEditPage N-P1-3 编辑态健壮性', () => {
  it('① isLoading → 渲染骨架不渲染表单', () => {
    mockAddresses = { isLoading: true };
    const { getByTestId, queryByDisplayValue } = render(<EditPage />, { wrapper });
    expect(getByTestId('addr-edit-loading')).toBeTruthy();
    expect(queryByDisplayValue('Maria Silva')).toBeNull();
  });

  it('② 编辑态 id 有值但数据查不到 → 显式错误态 + 返回按钮，绝不静默落 create', () => {
    mockAddresses = { data: [], isLoading: false }; // id='a1' 在列表中不存在
    const { getByTestId, queryByDisplayValue } = render(<EditPage />, { wrapper });
    expect(getByTestId('addr-edit-notfound')).toBeTruthy();
    expect(getByTestId('addr-edit-back')).toBeTruthy();
    // 表单没渲染 → 不可能触发 create
    expect(queryByDisplayValue('Maria Silva')).toBeNull();
  });

  it('③ 查不到时标题仍是 Edit（isEditing 按 id 判定，不随 existing 消失）', () => {
    mockAddresses = { data: [], isLoading: false };
    const { getByText } = render(<EditPage />, { wrapper });
    expect(getByText('address.edit')).toBeTruthy();
    expect(() => getByText('address.add')).toThrow();
  });
});
