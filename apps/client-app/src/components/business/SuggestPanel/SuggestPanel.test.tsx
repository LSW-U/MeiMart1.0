import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SuggestPanel } from './SuggestPanel';
import type { Product } from '@/types';

// Why: mock react-i18next（同 MasonryProductCard.test 模式），t(key) 返回 key 或带插值的文案
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const name = options?.name as string | undefined;
      const q = options?.q as string | undefined;
      if (key === 'product.viewItem') return `View ${name}`;
      if (key === 'search.suggested') return 'Suggested Searches';
      if (key === 'search.suggestedProducts') return 'Popular Products';
      if (key === 'search.noSuggestion') return `No suggestions for "${q}"`;
      if (key === 'common.loading') return 'Loading...';
      return key;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const mockProduct = (id: string): Product => ({
  id,
  name: { zh: `商品 ${id}`, en: `Product ${id}`, tet: `Product ${id}` },
  price: 9.9,
  image: `https://example.com/${id}.jpg`,
  category: 'cat-1',
  salesCount: 100,
});

describe('SuggestPanel', () => {
  it('renders words and products sections', () => {
    const { getByText, getByLabelText } = render(
      <SuggestPanel
        words={[{ word: 'apple', searchCount: 1300 }]}
        products={[mockProduct('p1')]}
        query="app"
        onWordPress={jest.fn()}
        onProductPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(getByText('Suggested Searches')).toBeTruthy();
    expect(getByText('apple')).toBeTruthy();
    expect(getByText('Popular Products')).toBeTruthy();
    expect(getByLabelText('View Product p1')).toBeTruthy();
  });

  it('hides word section when words empty, shows products only', () => {
    const { queryByText, getByLabelText } = render(
      <SuggestPanel
        words={[]}
        products={[mockProduct('p1')]}
        query="app"
        onWordPress={jest.fn()}
        onProductPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(getByLabelText('View Product p1')).toBeTruthy();
    expect(queryByText('Suggested Searches')).toBeNull();
  });

  it('shows loading state when isLoading and all empty', () => {
    const { getByText, queryByText } = render(
      <SuggestPanel
        words={[]}
        products={[]}
        query="app"
        isLoading
        onWordPress={jest.fn()}
        onProductPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(getByText('Loading...')).toBeTruthy();
    expect(queryByText('Popular Products')).toBeNull();
  });

  it('shows empty state with hot fallback chips when all empty', () => {
    const onHot = jest.fn();
    const { getByText } = render(
      <SuggestPanel
        words={[]}
        products={[]}
        query="xyz"
        hotFallback={[{ word: 'rice', searchCount: 500 }]}
        onWordPress={jest.fn()}
        onProductPress={jest.fn()}
        onHotFallbackPress={onHot}
      />,
      { wrapper },
    );
    expect(getByText('No suggestions for "xyz"')).toBeTruthy();
    fireEvent.press(getByText('rice'));
    expect(onHot).toHaveBeenCalledWith('rice');
  });

  it('calls onWordPress when word pressed', () => {
    const onWordPress = jest.fn();
    const { getByLabelText } = render(
      <SuggestPanel
        words={[{ word: 'apple', searchCount: 100 }]}
        products={[]}
        query="app"
        onWordPress={onWordPress}
        onProductPress={jest.fn()}
      />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('Search apple'));
    expect(onWordPress).toHaveBeenCalledWith('apple');
  });

  it('calls onProductPress when product pressed', () => {
    const onProductPress = jest.fn();
    const { getByLabelText } = render(
      <SuggestPanel
        words={[]}
        products={[mockProduct('p1')]}
        query="app"
        onWordPress={jest.fn()}
        onProductPress={onProductPress}
      />,
      { wrapper },
    );
    fireEvent.press(getByLabelText('View Product p1'));
    expect(onProductPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });
});
