// T7 更正批（20261117）transformOrder 断链回归测试
// 背景：后端 deliveryAddress/deliveryFee/discountAmount 一直返回，transform 漏映射
//   address 导致 real 模式详情页地址卡整卡不渲染、物流页显「Address not available」
//   （mock 给全字段掩盖断链，同 prisma select 白名单前科）。本测试锁死映射不回退。
// mock 模式参考 orders-cart-p2.test.ts 既有模式（hoisted 变量 + getter isMockMode）。
import { orderApi } from '@/services/orders';

let mockIsMockMode = false;
const mockApiGet = jest.fn();

jest.mock('@/services/api', () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/services/products', () => ({
  productApi: { getProduct: jest.fn().mockResolvedValue(undefined) },
}));

// 最小合法 OrderRaw（批1 T1 后 items/events 缺失即抛，需带齐）
const baseRaw = {
  id: 'o1',
  orderNo: 'NO-1',
  userId: 'u1',
  warehouseId: 'w1',
  status: 'CONFIRMED',
  totalAmount: 10000,
  deliveryFee: 500,
  discountAmount: 200,
  payableAmount: 10300,
  remark: null,
  riderId: null,
  paymentMethod: 'COD',
  paymentStatus: 'UNPAID',
  paidAt: null,
  createdAt: '2026-11-17T00:00:00.000Z',
  confirmedAt: null,
  pickedAt: null,
  deliveringAt: null,
  deliveredAt: null,
  completedAt: null,
  cancelledAt: null,
  cancelReason: null,
  items: [],
  events: [],
};

describe('transformOrder 地址快照映射（T7 更正批断链回归）', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false; // real 模式驱动 transformOrder（mock 模式不经过 transform，测不到断链）
  });

  it('deliveryAddress 有值 → Order.address 映射 name/phone/detail，省市区置空串', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        ...baseRaw,
        deliveryAddress: {
          name: '张三',
          phone: '+670123456',
          detail: 'Dili, Too Suli #12',
          lat: -8.56,
          lng: 125.56,
        },
      },
    });
    const order = await orderApi.getOrder('o1');
    expect(order?.address).toEqual({
      id: '',
      name: '张三',
      phone: '+670123456',
      province: '',
      city: '',
      district: '',
      detail: 'Dili, Too Suli #12',
      isDefault: false,
      lat: -8.56,
      lng: 125.56,
    });
  });

  it('deliveryAddress null（历史数据）→ address undefined，页面走 not-available 兜底', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { ...baseRaw, deliveryAddress: null } });
    const order = await orderApi.getOrder('o1');
    expect(order?.address).toBeUndefined();
  });

  it('deliveryAddress 缺字段（历史快照）→ 空串兜底不崩', async () => {
    mockApiGet.mockResolvedValueOnce({
      data: { ...baseRaw, deliveryAddress: { detail: 'X' } },
    });
    const order = await orderApi.getOrder('o1');
    expect(order?.address?.name).toBe('');
    expect(order?.address?.phone).toBe('');
    expect(order?.address?.detail).toBe('X');
  });
});

describe('transformOrder 费用分项（tracking Summary 数据源）', () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockIsMockMode = false;
  });

  it('deliveryFee/discountAmount 分→元转换透出', async () => {
    mockApiGet.mockResolvedValueOnce({ data: { ...baseRaw, deliveryAddress: null } });
    const order = await orderApi.getOrder('o1');
    expect(order?.deliveryFee).toBe(5); // 500 分
    expect(order?.discountAmount).toBe(2); // 200 分
    expect(order?.totalPrice).toBe(103); // payableAmount 10300 分
  });
});
