/**
 * C-P2-7: orders.cancelOrder 尾部 getOrder undefined 显式抛错（不再强转谎报类型）
 * 批3#11: cart service 确定性业务失败抛 name==='BusinessError'（useOfflineMutation 守卫不入队）
 */
import { orderApi } from '@/services/orders';
import { cartApi, businessError } from '@/services/cart';

let mockIsMockMode = false;
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiDelete = jest.fn();

jest.mock('@/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
    patch: jest.fn(),
  },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));
jest.mock('@/services/mockDb', () => ({
  mockDb: { orders: [], cart: { items: [], totalPrice: 0, totalItems: 0 }, products: [] },
  mockResponse: (v: unknown) => Promise.resolve(v),
}));

jest.mock('@/services/products', () => ({
  productApi: { getProduct: jest.fn().mockResolvedValue(undefined) },
}));

describe('C-P2-7 orders.cancelOrder 显式断言', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockIsMockMode = false;
  });

  it('cancel 成功后 getOrder 有值 → 返回订单', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { id: 'o1', status: 'CANCELLED' } });
    // 批1 T1 后 transformOrder 要求 items/events 必备（缺失即抛），mock 需带齐最小合法结构
    mockApiGet.mockResolvedValueOnce({
      data: { id: 'o1', status: 'CANCELLED', items: [], events: [] },
    });
    const out = await orderApi.cancelOrder('o1');
    expect(out.id).toBe('o1');
  });

  it('cancel 后 getOrder undefined → 抛错（不再 as 强转吞 undefined）', async () => {
    // Why: getOrder 的 undefined 仅来自 404 降级语义（real 下 404 由 axios reject 抛出），
    //   为覆盖 cancelOrder 尾部的 undefined 守卫分支，直接 mock getOrder 的返回层：
    //   real 模式下 getOrder 内 api.get 被 stub 成 resolve undefined 的形态不可行（res.data 会崩），
    //   改在 real 模式让二次 get 404（axios error 带 response.status）→ 但 getOrder 现无 404 降级。
    //   结论：守卫分支的直接驱动方式是 mock mockDb 模式的 cancelOrder 走不到——
    //   故用 spy 替换 orderApi.getOrder 返回 undefined 验证守卫本身。
    mockApiPost.mockResolvedValueOnce({ data: { id: 'o1', status: 'CANCELLED' } });
    const spy = jest.spyOn(orderApi, 'getOrder').mockResolvedValueOnce(undefined);
    await expect(orderApi.cancelOrder('o1')).rejects.toThrow('not found after cancel');
    expect(spy).toHaveBeenCalledWith('o1');
    spy.mockRestore();
  });
});

describe('批3#11 cart service BusinessError（确定性业务 4xx 不入队）', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiDelete.mockReset();
    mockIsMockMode = false;
  });

  it('businessError() 产出 name === "BusinessError" 的 Error', () => {
    const err = businessError('SOLD_OUT');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BusinessError');
    expect(err.message).toBe('SOLD_OUT');
  });

  it('addItemById 无 SKU → 抛 BusinessError（NO_SKU），useOfflineMutation 守卫可拦', async () => {
    // getProduct 返回 undefined（上面 mock）→ skuId 缺失
    await expect(cartApi.addItemById('p-none')).rejects.toMatchObject({
      name: 'BusinessError',
    });
  });

  it('removeItems 顺序 DELETE N 次 + 仅 1 次 getCart（C-P2-8 调用次数断言）', async () => {
    mockApiDelete.mockResolvedValue({ data: {} });
    mockApiGet.mockResolvedValue({ data: { items: [] } });
    await cartApi.removeItems(['a', 'b', 'a']);
    // 去重后 2 次 DELETE
    expect(mockApiDelete).toHaveBeenCalledTimes(2);
    expect(mockApiDelete).toHaveBeenNthCalledWith(1, '/client/cart/items/a');
    expect(mockApiDelete).toHaveBeenNthCalledWith(2, '/client/cart/items/b');
    // 收口仅 1 次 getCart
    expect(mockApiGet).toHaveBeenCalledTimes(1);
  });

  it('clearSelected 无选中项 → 0 次 DELETE + 0 次额外 getCart（C-P2-8）', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { items: [{ id: 'i1', isSelected: false }] } });
    await cartApi.clearSelected();
    expect(mockApiDelete).not.toHaveBeenCalled();
    expect(mockApiGet).toHaveBeenCalledTimes(1); // 仅初始读取
  });
});

// ── 批1 T1（D7）/ T2（D8）：响应数组缺失上抛 + 加购 skuId 优先 ──────────────

describe('批1 T1 响应数组缺失即异常上抛（撤 ?? [] 兜底）', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
  });

  const fullOrderRaw = {
    id: 'o1',
    orderNo: 'MM1',
    status: 'CONFIRMED',
    totalAmount: 2500,
    deliveryFee: 0,
    discountAmount: 0,
    payableAmount: 2500,
    paymentMethod: 'COD',
    paymentStatus: 'UNPAID',
    createdAt: '2026-10-04T00:00:00Z',
    items: [
      {
        id: 'oi1',
        productId: 'p1',
        skuId: 'sku1',
        productName: { en: 'Apple' },
        productImage: '',
        skuName: { en: '500g' },
        unitPrice: 2500,
        quantity: 1,
        subtotal: 2500,
      },
    ],
    events: [
      {
        id: 'e1',
        eventType: 'CREATED',
        toStatus: 'PENDING_PAYMENT',
        createdAt: '2026-10-04T00:00:00Z',
      },
    ],
  };

  it('getOrder 详情渲染回归：items/events 齐备时 transform 正常出CartItem 与 events', async () => {
    mockApiGet.mockResolvedValueOnce({ data: fullOrderRaw });
    const order = await orderApi.getOrder('o1');
    expect(order).toBeDefined();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0]).toMatchObject({ id: 'oi1', quantity: 1 });
    expect(order!.items[0]?.product.price).toBe(25); // 分→元
    const events = order!.events ?? [];
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe('CREATED');
  });

  it('getOrder 响应缺 items → 异常上抛（不再静默空列表渲染）', async () => {
    const { items: _omitted, ...noItems } = fullOrderRaw;
    mockApiGet.mockResolvedValueOnce({ data: noItems });
    await expect(orderApi.getOrder('o1')).rejects.toThrow();
  });

  it('getOrder 响应缺 events → 异常上抛', async () => {
    const { events: _omitted, ...noEvents } = fullOrderRaw;
    mockApiGet.mockResolvedValueOnce({ data: noEvents });
    await expect(orderApi.getOrder('o1')).rejects.toThrow();
  });

  it('getCart 响应缺 items → 异常上抛', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { id: 'c1', selectedSubtotal: 0, totalSubtotal: 0 } });
    await expect(cartApi.getCart()).rejects.toThrow();
  });
});

describe('批1 T2 addItemById skuId 优先（getProduct 降为最后 fallback）', () => {
  const mockGetProduct = jest.fn();
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockIsMockMode = false;
    // 覆盖顶部 mock 工厂里的 productApi.getProduct
    const productsModule = jest.requireMock('@/services/products') as {
      productApi: { getProduct: ReturnType<typeof jest.fn> };
    };
    productsModule.productApi.getProduct = mockGetProduct;
    mockGetProduct.mockReset();
  });

  it('入参带 skuId → getProduct 0 次，直接 POST skuId', async () => {
    mockApiPost.mockResolvedValueOnce({ data: {} });
    mockApiGet.mockResolvedValueOnce({ data: { items: [] } }); // getCart 收口
    await cartApi.addItemById('p1', 1, 'sku-known');
    expect(mockGetProduct).not.toHaveBeenCalled();
    expect(mockApiPost).toHaveBeenCalledWith('/client/cart/items', {
      skuId: 'sku-known',
      quantity: 1,
    });
  });

  it('入参无 skuId 且详情 defaultSkuId null → 显式 businessError（商品暂不可购买）', async () => {
    mockGetProduct.mockResolvedValueOnce({ id: 'p1', defaultSkuId: null });
    await expect(cartApi.addItemById('p1')).rejects.toMatchObject({
      name: 'BusinessError',
      message: expect.stringContaining('NO_SKU'),
    });
    expect(mockGetProduct).toHaveBeenCalledWith('p1');
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

describe('批1 审查 P1-1：createOrder 响应无 events 正常返回', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockIsMockMode = false;
  });

  it('real createOrder 响应不含 events（后端 order.service 不返回）→ 归一化补 [] 不崩', async () => {
    // 后端 createOrder return 对象仅 items/金额/状态（无 events，详情/列表端点才 include）
    mockApiPost.mockResolvedValueOnce({
      data: {
        id: 'o-new',
        status: 'PENDING_PAYMENT',
        items: [],
        payableAmount: 500,
        createdAt: '2026-10-04T00:00:00Z',
      },
    });
    const order = await orderApi.createOrder([], {
      deliveryAddressId: 'addr-1',
      paymentMethod: 'COD',
    } as never);
    expect(order.id).toBe('o-new');
    expect(order.events).toHaveLength(0);
  });

  it('详情端点缺 events 仍按契约破坏上抛（P1-1 归一化不放宽 getOrder 口径）', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'PENDING_PAYMENT', items: [] } });
    await expect(orderApi.getOrder('o1')).rejects.toThrow();
  });
});
