import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { MapPlaceholder } from './MapPlaceholder';
import type { RiderLocation } from '@/services/tracking';

// 测试环境未初始化 i18n，mock useTranslation 返回 key + count 插值（验证组件确实走了 t()）
// 参考 CartItemRow.test.tsx 模式，count 用 `:N` 后缀便于断言倒计数值
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options && 'count' in options) return `${key}:${options.count}`;
      return key;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const riderLocation: RiderLocation = {
  orderId: 'o1',
  lat: -8.5569,
  lng: 125.5603,
  timestamp: Date.now(),
  riderId: 'r1',
};

describe('MapPlaceholder', () => {
  it('renders street network + eta-pill (liveTracking fallback) + scale-bar when no estimatedArrival', () => {
    const { getByText } = render(
      <MapPlaceholder riderLocation={null} estimatedArrival={null} />,
      { wrapper },
    );
    // Why: estimatedArrival null → minAway null → etaText 走 liveTracking 兜底分支
    expect(getByText('tracking.liveTracking')).toBeTruthy();
    expect(getByText('tracking.scaleBar')).toBeTruthy();
  });

  it('shows X min away countdown when estimatedArrival is in the future', () => {
    // Why: 10 min 未来，minAway = round(10*60000 / 60000) = 10
    const future = new Date(Date.now() + 10 * 60_000).toISOString();
    const { getByText } = render(
      <MapPlaceholder riderLocation={null} estimatedArrival={future} />,
      { wrapper },
    );
    expect(getByText('tracking.minAway:10')).toBeTruthy();
  });

  it('shows Arriving now when estimatedArrival is at or past now', () => {
    // Why: 1 min 前，diff < 0 → Math.max(0, round(-1)) = 0 → arrivingNow 分支
    const past = new Date(Date.now() - 60_000).toISOString();
    const { getByText } = render(
      <MapPlaceholder riderLocation={null} estimatedArrival={past} />,
      { wrapper },
    );
    expect(getByText('tracking.arrivingNow')).toBeTruthy();
  });

  it('hides rider dot when riderLocation null, shows when present', () => {
    // Why: riderLocation 条件渲染（riderLocation ? <dot/> : null），testID 验证显隐
    const { queryByTestId, rerender, getByTestId } = render(
      <MapPlaceholder riderLocation={null} estimatedArrival={null} />,
      { wrapper },
    );
    expect(queryByTestId('map-rider-dot')).toBeNull();

    rerender(
      <ThemeProvider>
        <MapPlaceholder riderLocation={riderLocation} estimatedArrival={null} />
      </ThemeProvider>,
    );
    expect(getByTestId('map-rider-dot')).toBeTruthy();
  });
});
