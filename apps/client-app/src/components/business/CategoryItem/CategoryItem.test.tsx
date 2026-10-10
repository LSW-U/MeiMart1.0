import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { CategoryItem } from './CategoryItem';
import type { Category } from '@/types';

// C-P2-2（批4）：a11y label 收口到 t('product.a11y.category')——t mock 返 key（插值由
// check-i18n-keys 四语对账保证），断言 label 走 t() 链路
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// Why: 组件用 useLocalizer（@/i18n），测试环境未初始化 i18n——mock 纯串直通语义
jest.mock('@/i18n', () => ({
  __esModule: true,
  useLocalizer: () => (text: unknown) =>
    typeof text === 'string' ? text : ((text as Record<string, string>)?.en ?? ''),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const category: Category = { id: 'c1', name: 'Beverages', icon: 'coffee' };

describe('CategoryItem', () => {
  it('renders category name', () => {
    const { getByText } = render(<CategoryItem category={category} />, { wrapper });
    expect(getByText('Beverages')).toBeTruthy();
  });

  it('calls onPress with category', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<CategoryItem category={category} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('product.a11y.category'));
    expect(onPress).toHaveBeenCalledWith(category);
  });

  // Why: P6 §2.3 角标 - badge 驱动，无值不渲染
  it('renders NEW badge when category.badge = new', () => {
    const { getByText, queryByText } = render(
      <CategoryItem category={{ ...category, badge: 'new' }} />,
      { wrapper },
    );
    expect(getByText('common.badgeNew')).toBeTruthy();
    expect(queryByText('common.badgeHot')).toBeNull();
  });

  it('renders HOT badge when category.badge = hot', () => {
    const { getByText } = render(<CategoryItem category={{ ...category, badge: 'hot' }} />, {
      wrapper,
    });
    expect(getByText('common.badgeHot')).toBeTruthy();
  });

  it('does not render badge when category.badge undefined', () => {
    const { queryByText } = render(<CategoryItem category={category} />, { wrapper });
    expect(queryByText('common.badgeNew')).toBeNull();
    expect(queryByText('common.badgeHot')).toBeNull();
  });

  // C-P2-3: 同实例切图重置错误态——上一张图失败走 fallback 图标后，换新 uri 应回到图片分支
  it('uri 变化重置 imageError（列表复用切图后不再卡 fallback）', () => {
    const { rerender, getByTestId, queryByText } = render(
      <CategoryItem category={{ ...category, image: 'https://cdn.example.com/a.png' }} />,
      { wrapper },
    );
    // 第一张加载失败 → imageError=true → fallback 图标（'coffee'）渲染
    act(() => {
      getByTestId('category-item-image').props.onError({ nativeEvent: { error: 'mock' } });
    });
    expect(queryByText('coffee')).toBeTruthy();

    // 同实例换新 uri → imageError 重置 → 回到图片分支（fallback 图标卸载）
    rerender(<CategoryItem category={{ ...category, image: 'https://cdn.example.com/b.png' }} />);
    expect(queryByText('coffee')).toBeNull();
  });
});
