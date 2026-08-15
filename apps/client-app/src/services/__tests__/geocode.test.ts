import { fetchNearbyPlaces, searchPlaces } from '@/services/geocode';

// Why: geocode 是纯 fetch 封装（OSM 免费 API），单测 mock 全局 fetch 验证解析/排序逻辑
const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('geocode service', () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it('searchPlaces 解析 Nominatim 响应并过滤无效行', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { lat: '-8.5569', lon: '125.5603', display_name: 'Rua de Lecidere, Dili' },
        { lat: 'invalid', lon: '125.5', display_name: 'broken row' },
      ],
    });
    const hits = await searchPlaces('lecidere');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ lat: -8.5569, lng: 125.5603, label: 'Rua de Lecidere, Dili' });
    // 请求带 viewbox（东帝汶限定）
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('viewbox=');
    expect(url).toContain('bounded=1');
  });

  it('fetchNearbyPlaces 按距离升序取前 5', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        elements: [
          { id: 1, lat: -8.56, lon: 125.561, tags: { name: 'Far Shop' } }, // ~200m+
          { id: 2, lat: -8.5569, lon: 125.5603, tags: { name: 'Center POI' } }, // ~0m
          { id: 3, lat: -8.5569, lon: 125.5603, tags: {} }, // 无 name，过滤
        ],
      }),
    });
    const places = await fetchNearbyPlaces(-8.5569, 125.5603);
    expect(places.map((p) => p.name)).toEqual(['Center POI', 'Far Shop']);
    expect(places[0].distanceM).toBe(0);
    expect(places[0]).toMatchObject({ lat: -8.5569, lng: 125.5603 });
  });

  it('HTTP 非 2xx 抛错（上层 catch 降级）', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    await expect(searchPlaces('x')).rejects.toThrow('429');
  });
});
