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
    mockApiGet.mockResolvedValueOnce({ data: { id: 'o1', status: 'CANCELLED' } });
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
