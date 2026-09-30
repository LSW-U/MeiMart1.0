/**
 * C-P2-15: address service 不再伪造帝力默认坐标
 *
 * - isDiliDefaultCoords：缺坐标 / 帝力默认视野 → true（页面守卫用它阻止提交）
 * - toAddressPayload（经 createAddress）：lat/lng 缺失原样缺省透传，不再填帝力默认
 */
import { addressApi, isDiliDefaultCoords } from '@/services/address';

const mockApiPost = jest.fn();

jest.mock('@/services/api', () => ({
  api: { get: jest.fn(), post: (...args: unknown[]) => mockApiPost(...args) },
  isMockMode: false,
}));

describe('C-P2-15 isDiliDefaultCoords（未选地图点判定）', () => {
  it('缺坐标（undefined/null）→ true（未选点）', () => {
    expect(isDiliDefaultCoords(undefined, undefined)).toBe(true);
    expect(isDiliDefaultCoords(null, null)).toBe(true);
    expect(isDiliDefaultCoords(-8.5, undefined)).toBe(true);
  });

  it('帝力默认坐标（map.tsx 初始视野）→ true', () => {
    expect(isDiliDefaultCoords(-8.5569, 125.5603)).toBe(true);
  });

  it('真实选点坐标（非默认值）→ false', () => {
    expect(isDiliDefaultCoords(-8.5, 125.5)).toBe(false);
    expect(isDiliDefaultCoords(-8.5569, 125.5)).toBe(false); // 只有一维相同也不算默认
  });
});

describe('C-P2-15 createAddress payload 不伪造坐标', () => {
  beforeEach(() => {
    mockApiPost.mockReset();
  });

  it('lat/lng 缺失：payload 不含 lat/lng（不填帝力默认）', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { id: 'a1' } });
    await addressApi.createAddress({
      name: 'Maria',
      phone: '77123456',
      province: 'Dili',
      city: 'Dili',
      district: '',
      detail: 'Rua X',
      isDefault: false,
      tag: null,
    });
    const body = mockApiPost.mock.calls[0][1] as Record<string, unknown>;
    expect('lat' in body).toBe(false);
    expect('lng' in body).toBe(false);
  });

  it('显式坐标：payload 原样携带（更新旧地址补坐标场景）', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { id: 'a2' } });
    await addressApi.createAddress({
      name: 'Maria',
      phone: '77123456',
      province: 'Dili',
      city: 'Dili',
      district: '',
      detail: 'Rua X',
      isDefault: false,
      tag: null,
      lat: -8.5,
      lng: 125.5,
    });
    const body = mockApiPost.mock.calls[0][1] as Record<string, unknown>;
    expect(body.lat).toBe(-8.5);
    expect(body.lng).toBe(125.5);
  });
});
