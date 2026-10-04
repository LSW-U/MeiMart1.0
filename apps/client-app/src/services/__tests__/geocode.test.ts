import { fetchNearbyPlaces, reverseGeocode, searchPlaces, textGeocode } from '@/services/geocode';
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
    // 端点 + query 参数（后端 viewbox 限定东帝汶，前端不再拼直连 URL）
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

  // 前端接线切换 T2：reverseGeocode 切后端代理 GET /common/geo/reverse（走 axios api 实例，
  // signal 透传 axios config；formattedAddress null/缺失 → 空串不抛错）
  describe('reverseGeocode（后端 /common/geo/reverse）', () => {
    it('调后端 reverse 端点并透传 lat/lng，返回 formattedAddress', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          lat: -8.5569,
          lng: 125.5603,
          source: 'nominatim',
          formattedAddress: 'Rua 12 de Novembro, Dili, Timor-Leste',
        },
      });
      const label = await reverseGeocode(-8.5569, 125.5603);
      expect(label).toBe('Rua 12 de Novembro, Dili, Timor-Leste');
      expect(mockGet).toHaveBeenCalledWith('/common/geo/reverse', {
        params: { lat: -8.5569, lng: 125.5603 },
        signal: undefined,
      });
    });

    it('formattedAddress null（后端 fallback 态）兜底空串不抛错', async () => {
      mockGet.mockResolvedValueOnce({
        data: { lat: -8.5569, lng: 125.5603, source: 'fallback', formattedAddress: null },
      });
      expect(await reverseGeocode(-8.5569, 125.5603)).toBe('');
    });

    it('formattedAddress 字段缺失兜底空串', async () => {
      mockGet.mockResolvedValueOnce({ data: { lat: -8.5569, lng: 125.5603, source: 'fallback' } });
      expect(await reverseGeocode(-8.5569, 125.5603)).toBe('');
    });

    it('C-P1-6: signal 透传给 axios config（拖动打断 in-flight 请求）', async () => {
      mockGet.mockResolvedValueOnce({ data: { formattedAddress: 'x' } });
      const controller = new AbortController();
      await reverseGeocode(-8.5569, 125.5603, controller.signal);
      expect(mockGet).toHaveBeenCalledWith(
        '/common/geo/reverse',
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  // 批1 T5（D1/D9）：文本转坐标——edit 页文本框防抖消费
  describe('textGeocode（批1 T5，/common/geo/geocode）', () => {
    it('调后端 geocode 端点透传 address，nominatim 命中返回真实坐标', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          lat: -8.5568,
          lng: 125.5602,
          source: 'nominatim',
          formattedAddress: 'Rua de Lecidere, Dili, Timor-Leste',
        },
      });
      const result = await textGeocode('Rua de Lecidere, Dili');
      expect(result).toMatchObject({ lat: -8.5568, lng: 125.5602, source: 'nominatim' });
      expect(mockGet).toHaveBeenCalledWith('/common/geo/geocode', {
        params: { address: 'Rua de Lecidere, Dili' },
      });
    });

    it('短于 2 字符不发请求（后端 zod address 2-500 前置），返回 fallback 形态', async () => {
      const result = await textGeocode('a');
      expect(result.source).toBe('fallback');
      expect(result.formattedAddress).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('后端 fallback 态（source=fallback / formattedAddress null）原样透传，由调用方判不回填', async () => {
      mockGet.mockResolvedValueOnce({
        data: { lat: -8.5567, lng: 125.5595, source: 'fallback', formattedAddress: null },
      });
      const result = await textGeocode('unknown place');
      expect(result.source).toBe('fallback');
      expect(result.formattedAddress).toBeNull();
    });
  });
});
