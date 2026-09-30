/**
 * C-P1-6: 地图拖动 reverse 反地理 debounce + AbortController 取消
 *
 * 报告 §5：连续 regionChange（coords 连续变化）时 reverseGeocode 只发 1 次（500ms debounce）；
 * in-flight 请求在新一轮 effect cleanup 时 abort。geoSeq 兜底语义保留。
 *
 * 页面在 app/address/map.tsx（expo-router 路由目录禁 .test，统一放 app/__tests__）。
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import MapPickPage from '../address/map';

const mockReverseGeocode = jest.fn();
const mockFetchNearbyPlaces = jest.fn();

jest.mock('@/services/geocode', () => ({
  reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
  fetchNearbyPlaces: (...args: unknown[]) => mockFetchNearbyPlaces(...args),
  searchPlaces: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// react-native-maps：jest 环境无 native 模块，页面经 Platform.OS === 'web' 分支降级为 null
// （node 测试环境 Platform.OS === 'node' ≠ 'web'，需显式 mock require 结果为 null 不可行——
// 页面用 require('react-native-maps')，jest-expo RN 环境下该模块存在但 native 渲染不可用，
// mock 成可渲染壳即可）
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props: Record<string, unknown>) =>
    React.createElement(View, { testID: 'map-view', ...props });
  return { __esModule: true, default: MockMapView, Marker: View };
});

jest.mock('@/components/layout/SafeAreaWrapper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaWrapper: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, null, children),
  };
});

jest.mock('@/components/layout/StatusBar', () => ({ StatusBarConfig: () => null }));

jest.mock('@/store/mapPickStore', () => {
  const identity = (s: unknown): unknown => s;
  return {
    useMapPickStore: Object.assign(identity, {
      getState: () => ({ setPick: jest.fn() }),
      setState: jest.fn(),
      subscribe: () => () => {},
    }),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('C-P1-6 地图反地理 debounce（≥500ms 连续变化只发一次）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockReverseGeocode.mockResolvedValue('Rua Test, Dili');
    mockFetchNearbyPlaces.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('挂载不立即发 reverse（debounce 窗口内），500ms 后发 1 次', () => {
    render(<MapPickPage />, { wrapper });
    expect(mockReverseGeocode).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockReverseGeocode).toHaveBeenCalledTimes(1);
  });

  it('连续 10 次坐标变化（间隔 <500ms）→ debounce 后仅发 1 次 reverse', () => {
    const { getByTestId } = render(<MapPickPage />, { wrapper });
    const mapView = getByTestId('map-view');
    // 模拟拖动：连续 10 次 onRegionChangeComplete，间隔均小于 500ms
    for (let i = 0; i < 10; i++) {
      act(() => {
        jest.advanceTimersByTime(100);
        mapView.props.onRegionChangeComplete?.({
          latitude: -8.55 - i * 0.001,
          longitude: 125.56,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      });
    }
    // 每次变化都重置 debounce 窗口——此时尚无任何请求发出
    expect(mockReverseGeocode).not.toHaveBeenCalled();
    // 最后一次变化后停稳 500ms → 仅发最后一次坐标的 reverse
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockReverseGeocode).toHaveBeenCalledTimes(1);
    expect(mockReverseGeocode).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      expect.anything(), // AbortSignal（C-P1-6 in-flight 取消）
    );
  });

  it('in-flight 请求：新一轮 effect cleanup 时被 abort（signal 收到 abort）', () => {
    // reverse 挂起不 resolve——模拟慢网 in-flight
    mockReverseGeocode.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<MapPickPage />, { wrapper });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    const signal1 = mockReverseGeocode.mock.calls[0][2] as AbortSignal;
    expect(signal1.aborted).toBe(false);

    // 新一轮坐标变化 → cleanup：上一轮 debounce 已发出的请求应被 abort
    act(() => {
      jest.advanceTimersByTime(100);
      getByTestId('map-view').props.onRegionChangeComplete?.({
        latitude: -8.6,
        longitude: 125.6,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    });
    expect(signal1.aborted).toBe(true);
  });
});
