import { fetchNearbyPlaces, searchPlaces } from '@/services/geocode';
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
});
