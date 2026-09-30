import { fetchNearbyPlaces, reverseGeocode, searchPlaces } from '@/services/geocode';
import { api } from '@/services/api';

// Why: 批D D1 — searchPlaces/fetchNearbyPlaces 切后端代理（/common/geo/suggest、/common/geo/nearby），
//      单测 mock axios（api.get）验证端点/参数与解析；形态 {lat,lng,label} 与组件消费零改动。
const mockGet = api.get as jest.Mock;

jest.mock('@/services/api', () => ({
  api: { get: jest.fn() },
  isMockMode: false,
}));

describe('geocode service（后端代理）', () => {
  afterEach(() => {
    mockGet.mockReset();
  });

  it('searchPlaces 调 /common/geo/suggest 并透传 items', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        items: [
          { lat: -8.5569, lng: 125.5603, label: 'Rua de Lecidere, Dili' },
          { lat: -8.55, lng: 125.56, label: 'Colmera, Dili' },
        ],
      },
    });
    const hits = await searchPlaces('lecidere');
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ lat: -8.5569, lng: 125.5603, label: 'Rua de Lecidere, Dili' });
    // 端点 + query 参数（后端 viewbox 限定东帝汶，前端不再拼 Nominatim URL）
    expect(mockGet).toHaveBeenCalledWith('/common/geo/suggest', { params: { q: 'lecidere' } });
  });

  it('searchPlaces 短于 2 字符直接空列表（后端 zod q 2-500 校验前置）', async () => {
    const hits = await searchPlaces('a');
    expect(hits).toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('searchPlaces 后端无结果 items 缺失时兜底空数组', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    const hits = await searchPlaces('dili');
    expect(hits).toEqual([]);
  });

  it('fetchNearbyPlaces 调 /common/geo/nearby 并透传 lat/lng + items', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        items: [
          { id: 'osm-1', name: 'Center POI', distanceM: 0, lat: -8.5569, lng: 125.5603 },
          { id: 'osm-2', name: 'Far Shop', distanceM: 210, lat: -8.56, lng: 125.561 },
        ],
      },
    });
    const places = await fetchNearbyPlaces(-8.5569, 125.5603);
    expect(places.map((p) => p.name)).toEqual(['Center POI', 'Far Shop']);
    expect(places[0]).toMatchObject({ id: 'osm-1', distanceM: 0, lat: -8.5569, lng: 125.5603 });
    expect(mockGet).toHaveBeenCalledWith('/common/geo/nearby', {
      params: { lat: -8.5569, lng: 125.5603 },
    });
  });

  it('fetchNearbyPlaces items 缺失兜底空数组（后端失败返回空不抛错）', async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    const places = await fetchNearbyPlaces(-8.5569, 125.5603);
    expect(places).toEqual([]);
  });

  // B 部分（批4）：reverseGeocode 保留 Nominatim 直调（后端无 reverse 端点），
  // 走全局 fetch 而非 axios api.get —— 用 global.fetch mock 验证
  describe('reverseGeocode（Nominatim 直调）', () => {
    const mockFetch = jest.fn();

    beforeAll(() => {
      globalThis.fetch = mockFetch as unknown as typeof fetch;
    });

    afterEach(() => {
      mockFetch.mockReset();
    });

    it('拼 reverse URL + 带 UA 头，返回 display_name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: 'Rua 12 de Novembro, Dili, Timor-Leste' }),
      });
      const label = await reverseGeocode(-8.5569, 125.5603);
      expect(label).toBe('Rua 12 de Novembro, Dili, Timor-Leste');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=-8.5569&lon=125.5603',
        expect.objectContaining({ headers: { 'User-Agent': 'MeiMart-client/1.0' } }),
      );
    });

    it('display_name 缺失兜底空串', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      expect(await reverseGeocode(-8.5569, 125.5603)).toBe('');
    });

    it('res 非 ok 抛 Nominatim reverse {status}', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
      await expect(reverseGeocode(-8.5569, 125.5603)).rejects.toThrow('Nominatim reverse 429');
    });

    it('C-P1-6: signal 透传给 fetch（拖动打断 in-flight 请求）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: 'x' }),
      });
      const controller = new AbortController();
      await reverseGeocode(-8.5569, 125.5603, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
