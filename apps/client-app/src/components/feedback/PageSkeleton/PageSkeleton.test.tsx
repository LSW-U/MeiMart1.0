import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { ThemeProvider } from '@/theme';
import { PageSkeleton } from './PageSkeleton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

/** 取 shimmer 高光层 Animated.View 的 translateX 插值 outputRange（_config 持有插值配置） */
function getShimmerOutputRange(shimmerEl: ReactTestInstance): unknown[] {
  const style = shimmerEl.props.children.props.style;
  const styleArr = Array.isArray(style) ? style : [style];
  for (const s of styleArr) {
    const transform = (s as { transform?: { translateX?: unknown }[] }).transform;
    if (!transform) continue;
    for (const t of transform) {
      const outputRange = (t as { translateX?: { _config?: { outputRange?: unknown[] } } })
        .translateX?._config?.outputRange;
      if (outputRange) return outputRange;
    }
  }
  throw new Error('shimmer translateX interpolation not found');
}

describe('PageSkeleton', () => {
  it.each(['list', 'grid', 'detail'] as const)('renders %s variant', (variant) => {
    const { getByTestId } = render(<PageSkeleton variant={variant} />, { wrapper });
    // 容器 + shimmer 高光层均存在
    expect(getByTestId('page-skeleton')).toBeTruthy();
    expect(getByTestId('page-skeleton-shimmer')).toBeTruthy();
  });

  it('renders custom testID and propagates to shimmer layer', () => {
    const { getByTestId } = render(<PageSkeleton testID="orders-loading" />, { wrapper });
    expect(getByTestId('orders-loading')).toBeTruthy();
    expect(getByTestId('orders-loading-shimmer')).toBeTruthy();
  });

  it('list variant renders the requested row count', () => {
    const { UNSAFE_getAllByType } = render(<PageSkeleton variant="list" rows={6} />, { wrapper });
    // Skeleton 原子组件：header 1 个 + 每行 3 个（图 + 两行文本）
    const skeletons = UNSAFE_getAllByType(
      require('@/components/ui/Skeleton').Skeleton as React.ComponentType,
    );
    expect(skeletons).toHaveLength(1 + 6 * 3);
  });

  it('grid variant renders two rows of two cards', () => {
    const { UNSAFE_getAllByType } = render(<PageSkeleton variant="grid" />, { wrapper });
    const skeletons = UNSAFE_getAllByType(
      require('@/components/ui/Skeleton').Skeleton as React.ComponentType,
    );
    // 每卡 3 个 × 4 卡 = 12（grid 无 header 外的额外行）
    expect(skeletons).toHaveLength(13);
  });

  it('shimmer layer is non-interactive overlay', () => {
    const { getByTestId } = render(<PageSkeleton />, { wrapper });
    expect(getByTestId('page-skeleton-shimmer').props.pointerEvents).toBe('none');
  });

  it('shimmer outputRange is numeric (native-driver safe, no percent strings)', () => {
    const { getByTestId } = render(<PageSkeleton />, { wrapper });
    // onLayout 未触发时容器宽 0 → outputRange 为 [0, 0] 数值区间；
    // 关键回归防线：禁止百分比字符串（native driver 插值仅支持数值/color）
    const outputRange = getShimmerOutputRange(getByTestId('page-skeleton-shimmer'));
    expect(outputRange).toHaveLength(2);
    for (const v of outputRange) {
      expect(typeof v).toBe('number');
      expect(Number.isNaN(v as number)).toBe(false);
      expect(String(v)).not.toMatch(/%$/);
    }
  });

  it('measures container width via onLayout and rescales outputRange numerically', () => {
    const { getByTestId } = render(<PageSkeleton />, { wrapper });
    // 模拟 onLayout 量到 375dp 宽 → outputRange 应为 ±562.5（1.5×375）
    act(() => {
      getByTestId('page-skeleton').props.onLayout?.({
        nativeEvent: { layout: { width: 375, height: 800 } },
      });
    });
    expect(getShimmerOutputRange(getByTestId('page-skeleton-shimmer'))).toEqual([-562.5, 562.5]);
  });
});
