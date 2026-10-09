/**
 * 订单历史接线收口批：orderApi real 分支直测（mock api 层，earnings.test.ts 同款）——
 *   ① fromView：income 分→元 /100
 *   ② getHistory：翻页循环拉全 + total 终止 + 响应缺 items 上抛（不静默空列表）
 *   ③ getById：404 → 业务 null；非 404 原样上抛
 *   ④ countByStatus 字段透传；getTodayStats 透传 count + totalIncome 分→元
 * mock 层走 isMockMode=false 强制 real 分支。
 */
import { ApiError, api } from '../api';
import { orderApi } from '../order';

// mock api 层但保留真实 buildQuery（qs 序列化，URL 断言依赖）：
// requireActual 展开 + 覆盖 isMockMode/api 实例，earnings.test.ts 的 mock 模式 + buildQuery 补丁。
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  isMockMode: false,
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockGet = api.get as jest.Mock;

/** 后端原样条目（§2.1 单对象，income 为分） */
const raw = (over: Record<string, unknown> = {}) => ({
  id: 'task-1',
  orderNo: 'MM202610010001',
  status: 'completed',
  completedAt: 1786003257033,
  pickupName: 'Dili Warehouse',
  pickupAddress: 'Rua 15 de Outubro, Dili',
  dropoffName: 'Hotel Timor',
  dropoffAddress: 'Avenida Marechal Carmona, Dili',
  income: 500, // 分
  distanceKm: 0.0348,
  durationMinutes: 28,
  ...over,
});

describe('orderApi 真实接线（订单历史接线收口批）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fromView / getHistory', () => {
    it('income 分→元：500 → 5.00（其余字段直通）', async () => {
      mockGet.mockResolvedValueOnce({ data: { items: [raw()], total: 1 } });

      const res = await orderApi.getHistory();

      expect(mockGet).toHaveBeenCalledWith('/rider/orders/history?page=1&pageSize=100');
      expect(res).toHaveLength(1);
      expect(res[0]?.income).toBe(5);
      expect(res[0]?.id).toBe('task-1');
      expect(res[0]?.status).toBe('completed');
      expect(res[0]?.completedAt).toBe(1786003257033);
    });

    it('翻页循环：total>单页时继续拉，凑齐 total 后终止', async () => {
      const pageOf = (prefix: string) =>
        Array.from({ length: 100 }, (_, i) => raw({ id: `${prefix}-${i}` }));
      mockGet
        .mockResolvedValueOnce({ data: { items: pageOf('p1'), total: 150 } })
        .mockResolvedValueOnce({ data: { items: pageOf('p2').slice(0, 50), total: 150 } });

      const res = await orderApi.getHistory();

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(2, '/rider/orders/history?page=2&pageSize=100');
      expect(res).toHaveLength(150);
    });

    it('响应缺 items：按契约破坏上抛，不静默空列表', async () => {
      mockGet.mockResolvedValueOnce({ data: { total: 0 } });

      await expect(orderApi.getHistory()).rejects.toThrow('response missing items');
    });
  });

  describe('getById', () => {
    it('成功：fromView 适配（income 分→元）', async () => {
      mockGet.mockResolvedValueOnce({ data: raw() });

      const res = await orderApi.getById('task-1');

      expect(mockGet).toHaveBeenCalledWith('/rider/orders/task-1');
      expect(res?.income).toBe(5);
    });

    it('404 → 业务 null（非本人/非历史范围，[id].tsx 走 notFound 空态）', async () => {
      mockGet.mockRejectedValueOnce(
        new ApiError(404, 'E-RIDER-001', 'Task not found in order history'),
      );

      await expect(orderApi.getById('nope')).resolves.toBeNull();
    });

    it('非 404（如 500）：原样上抛', async () => {
      mockGet.mockRejectedValueOnce(new ApiError(500, 'E-SYS-001', 'boom'));

      await expect(orderApi.getById('task-1')).rejects.toThrow('boom');
    });
  });

  describe('countByStatus / getTodayStats', () => {
    it('countByStatus：GET stats/status-counts + 四值透传', async () => {
      mockGet.mockResolvedValueOnce({
        data: { all: 17, completed: 17, cancelled: 0, transferred: 0 },
      });

      const res = await orderApi.countByStatus();

      expect(mockGet).toHaveBeenCalledWith('/rider/orders/stats/status-counts');
      expect(res).toEqual({ all: 17, completed: 17, cancelled: 0, transferred: 0 });
    });

    it('getTodayStats：GET stats/today + count 透传 + totalIncome 分→元', async () => {
      mockGet.mockResolvedValueOnce({ data: { count: 3, totalIncome: 6300 } });

      const res = await orderApi.getTodayStats();

      expect(mockGet).toHaveBeenCalledWith('/rider/orders/stats/today');
      expect(res).toEqual({ count: 3, totalIncome: 63 });
    });
  });
});
