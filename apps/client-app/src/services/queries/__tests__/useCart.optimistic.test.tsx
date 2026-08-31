import { act, waitFor } from '@testing-library/react-native';
import type { Cart, Product } from '@/types';
import { cartApi } from '@/services/cart';
// Why: CART_QUERY_KEY 是 factory（locale 入 key，i18n 缓存修复）；测试环境未初始化 i18n，
//      useLocale() 走 fallback 'en'，故断言用 CART_QUERY_KEY('en') 与 hook 内 key 一致
import {
  CART_QUERY_KEY,
  useToggleCartItem,
  useUpdateCartItem,
  useRemoveCartItem,
} from '../useCart';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/cart');

const sampleProduct: Product = {
  id: 'p1',
  name: { zh: '苹果', en: 'Apple', tet: 'Maçã' },
  price: 9.9,
  image: '',
  category: 'fruit',
};

const baseCart: Cart = {
  items: [
    { id: 'ci1', product: sampleProduct, quantity: 2, selected: true },
    {
      id: 'ci2',
      product: {
        ...sampleProduct,
        id: 'p2',
        name: { zh: '香蕉', en: 'Banana', tet: 'Huu' },
        price: 5,
      },
      quantity: 3,
      selected: false,
    },
  ],
  totalItems: 2,
  totalPrice: 19.8,
};

function setup() {
  (cartApi.getCart as jest.Mock).mockResolvedValue(baseCart);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(CART_QUERY_KEY('en'), baseCart);
  return queryClient;
}

describe('useCart 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useToggleCartItem 立即切换 selected 并重算 totals', async () => {
    (cartApi.toggleSelect as jest.Mock).mockResolvedValue(baseCart);
    const qc = setup();

    const { result } = renderHookWithClient(() => useToggleCartItem(), qc);
    await act(async () => {
      await result.current.mutateAsync({ itemId: 'ci2', selected: true });
    });

    const cart = qc.getQueryData<Cart>(CART_QUERY_KEY('en'));
    expect(cart?.items[1].selected).toBe(true);
    expect(cart?.totalItems).toBe(5);
    expect(cart?.totalPrice).toBe(34.8); // 9.9*2 + 5*3
  });

  it('useToggleCartItem 服务端失败时 rollback', async () => {
    (cartApi.toggleSelect as jest.Mock).mockRejectedValue(new Error('network'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useToggleCartItem(), qc);
    await act(async () => {
      try {
        await result.current.mutateAsync({ itemId: 'ci2', selected: true });
      } catch {
        // expected
      }
    });

    await waitFor(() => {
      const cart = qc.getQueryData<Cart>(CART_QUERY_KEY('en'));
      expect(cart?.items[1].selected).toBe(false);
    });
  });

  it('useUpdateCartItem 立即 merge updates 并重算', async () => {
    (cartApi.updateItem as jest.Mock).mockResolvedValue(baseCart);
    const qc = setup();

    const { result } = renderHookWithClient(() => useUpdateCartItem(), qc);
    await act(async () => {
      await result.current.mutateAsync({ itemId: 'ci1', updates: { quantity: 5 } });
    });

    const cart = qc.getQueryData<Cart>(CART_QUERY_KEY('en'));
    expect(cart?.items[0].quantity).toBe(5);
    expect(cart?.totalItems).toBe(5);
    expect(cart?.totalPrice).toBe(49.5);
  });

  it('useRemoveCartItem 立即从列表移除', async () => {
    (cartApi.removeItem as jest.Mock).mockResolvedValue(baseCart);
    const qc = setup();

    const { result } = renderHookWithClient(() => useRemoveCartItem(), qc);
    await act(async () => {
      await result.current.mutateAsync('ci1');
    });

    const cart = qc.getQueryData<Cart>(CART_QUERY_KEY('en'));
    expect(cart?.items.find((i) => i.id === 'ci1')).toBeUndefined();
    expect(cart?.items).toHaveLength(1);
  });
});
