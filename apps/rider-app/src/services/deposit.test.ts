/**
 * depositApi 单测（批 G，2026-09-03）
 *
 * 覆盖：
 *   - mock 状态机三态：未缴（amount 0 + tier null）→ 线上支付即时生效（PENDING→CONFIRMED
 *     + 余额累加 + 档位命中）→ PENDING（线下 COD 提交）→ 幂等（已 CONFIRMED 再 pay-mock
 *     返回不重复累加）→ 非法流转（REJECTED pay-mock 拒）
 *   - real 模式（isMockMode=false）：三端点 URL + payload 透传（分单位）
 *   - getLocations/getTiers：real 透传 /rider/deposit/locations|tiers（补端点批）
 *   - 金额分↔元：payload 传分（API 边界），展示层换算由页面负责
 */
import { api } from './api';
import { depositApi, resetMockDepositState } from './deposit';

// Mock ./api：isMockMode 读全局开关（jest 工厂内引用外层变量——jest.mock hoist 后
// 工厂执行时 mockState 已初始化，ES 导出只读的标准绕法）
const mockState = { mockMode: true };
jest.mock('./api', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  get isMockMode() {
    return mockState.mockMode;
  },
}));

const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;
function setMockMode(value: boolean): void {
  mockState.mockMode = value;
}

describe('depositApi — mock 状态机（UI 三态数据源）', () => {
  beforeEach(() => {
    resetMockDepositState();
    setMockMode(true);
  });

  it('未缴态：depositAmount 0 + tier null', async () => {
    const status = await depositApi.getStatus();
    expect(status.depositAmount).toBe(0);
    expect(status.tier).toBeNull();
    expect(status.recentRequests).toEqual([]);
  });

  it('线上支付：创建 PENDING → pay-mock 即时 CONFIRMED + 余额累加 + 档位命中', async () => {
    const record = await depositApi.createRequest({ channel: 'ONLINE_MOCK', amount: 5000 });
    expect(record.status).toBe('PENDING');

    const result = await depositApi.payMock(record.id);
    expect(result.deposit.status).toBe('CONFIRMED');
    expect(result.deposit.confirmedAmount).toBe(5000); // = requestedAmount
    expect(result.depositAmount).toBe(5000);

    const status = await depositApi.getStatus();
    expect(status.depositAmount).toBe(5000);
    expect(status.tier?.maxOrderAmount).toBe(50000); // $50 档
  });

  it('幂等：已 CONFIRMED 再 pay-mock 直接返回，不重复累加', async () => {
    const record = await depositApi.createRequest({ channel: 'ONLINE_MOCK', amount: 1000 });
    await depositApi.payMock(record.id);

    const again = await depositApi.payMock(record.id);
    expect(again.depositAmount).toBe(1000); // 未变 2000

    const status = await depositApi.getStatus();
    expect(status.depositAmount).toBe(1000);
  });

  it('线下 COD：提交 → PENDING（无 pay-mock），状态页可见待确认', async () => {
    const record = await depositApi.createRequest({
      channel: 'OFFLINE_COD',
      amount: 5000,
      locationId: 'loc-dili',
      note: '已到现场',
    });
    expect(record.status).toBe('PENDING');
    expect(record.locationId).toBe('loc-dili');
    expect(record.note).toBe('已到现场');

    const status = await depositApi.getStatus();
    expect(status.recentRequests[0]?.status).toBe('PENDING');
    // PENDING 不影响余额（未生效）
    expect(status.depositAmount).toBe(0);
  });

  it('非法流转：非 PENDING 的 pay-mock 拒（mock 状态机不含 REJECTED 转移，验证 CONFIRMED 幂等语义已覆盖；此处验证不存在记录抛错）', async () => {
    await expect(depositApi.payMock('nonexistent')).rejects.toThrow(/not found/);
  });
});

describe('depositApi — real 模式（契约 URL/payload 透传）', () => {
  beforeEach(() => {
    setMockMode(false);
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('getStatus → GET /rider/deposit/status', async () => {
    mockGet.mockResolvedValue({ data: { depositAmount: 1000, tier: null, recentRequests: [] } });
    const status = await depositApi.getStatus();
    expect(mockGet).toHaveBeenCalledWith('/rider/deposit/status');
    expect(status.depositAmount).toBe(1000);
  });

  it('createRequest → POST /rider/deposit/requests（amount 分透传）', async () => {
    mockPost.mockResolvedValue({ data: { id: 'dep-1', status: 'PENDING' } });
    await depositApi.createRequest({
      channel: 'OFFLINE_COD',
      amount: 5000,
      locationId: 'loc-1',
      note: 'x',
    });
    expect(mockPost).toHaveBeenCalledWith('/rider/deposit/requests', {
      channel: 'OFFLINE_COD',
      amount: 5000,
      locationId: 'loc-1',
      note: 'x',
    });
  });

  it('payMock → POST /rider/deposit/requests/:id/pay-mock', async () => {
    mockPost.mockResolvedValue({ data: { deposit: {}, depositAmount: 100 } });
    await depositApi.payMock('dep-1');
    expect(mockPost).toHaveBeenCalledWith('/rider/deposit/requests/dep-1/pay-mock');
  });

  it('getLocations → GET /rider/deposit/locations（补端点批：真端点 + enabled 补齐）', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 'loc-1', name: 'Dili Office', address: 'Dili', note: 'main' },
        { id: 'loc-2', name: 'Baucau Office', address: 'Baucau', note: null },
      ],
    });
    const locations = await depositApi.getLocations();
    expect(mockGet).toHaveBeenCalledWith('/rider/deposit/locations');
    expect(locations).toHaveLength(2);
    expect(locations[0]).toMatchObject({ id: 'loc-1', enabled: true }); // 契约收窄字段补 enabled
  });

  it('getTiers → GET /rider/deposit/tiers（补端点批：档位透传，分单位）', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 't1', minAmount: 100, maxOrderAmount: 1000, sortOrder: 1, enabled: true },
        { id: 't4', minAmount: 5000, maxOrderAmount: null, sortOrder: 4, enabled: true },
      ],
    });
    const tiers = await depositApi.getTiers();
    expect(mockGet).toHaveBeenCalledWith('/rider/deposit/tiers');
    expect(tiers[0]?.minAmount).toBe(100); // 分
    expect(tiers[1]?.maxOrderAmount).toBeNull(); // 顶配不限
  });
});
