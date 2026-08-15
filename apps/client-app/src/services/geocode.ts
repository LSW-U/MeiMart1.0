// Geocode service — OSM Nominatim/Overpass 免费直调（无 API key，决策 4）
// Why: 后端 geocode 代理端点未建（方案 B1），先用 OSM 免费方案前端直调；
//      Nominatim 使用政策要求带自定义 User-Agent（浏览器端自动降级为 Origin）。
// 东帝汶 bounding box：lat -10.6~-7.9, lng 123.9~127.5（搜索限定，避免同名地点干扰）
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const TL_VIEWBOX = '123.9,-10.6,127.5,-7.9'; // left,top,right,bottom

export interface GeoHit {
  lat: number;
  lng: number;
  label: string;
}

export interface NearbyPlaceResult {
  id: string;
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
}

function nominatimHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
    // Why: Nominatim 政策要求可识别的 UA（Web 端 fetch 不允许自定义 UA，靠 Origin 识别）
    'User-Agent': 'MeiMart-client/1.0 (delivery address picker)',
  };
}

/** 关键词搜索地点（限东帝汶视野内），返回前 5 条 */
export async function searchPlaces(query: string): Promise<GeoHit[]> {
  const url =
    `${NOMINATIM}/search?format=jsonv2&limit=5&addressdetails=0` +
    `&viewbox=${TL_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: nominatimHeaders() });
  if (!res.ok) throw new Error(`Nominatim search ${res.status}`);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const hit = r as { lat: string; lon: string; display_name?: string };
      return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name ?? '' };
    })
    .filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng) && h.label);
}

/** 反地理编码：坐标 → 地址文本 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `${NOMINATIM}/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`,
    { headers: nominatimHeaders() },
  );
  if (!res.ok) throw new Error(`Nominatim reverse ${res.status}`);
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? '';
}

/** Haversine 距离（米） */
function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

/** 附近位置：Overpass 查坐标 2km 内带名称的节点，按距离取前 5（决策 4 附近位置真实化） */
export async function fetchNearbyPlaces(lat: number, lng: number): Promise<NearbyPlaceResult[]> {
  const query = `[out:json][timeout:10];node(around:2000,${lat},${lng})["name"];out center 20;`;
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as {
    elements?: { id: number; lat: number; lon: number; tags?: { name?: string } }[];
  };
  return (data.elements ?? [])
    .filter((e) => e.tags?.name)
    .map((e) => ({
      id: `osm-${e.id}`,
      name: e.tags?.name ?? '',
      distanceM: distanceMeters(lat, lng, e.lat, e.lon),
      lat: e.lat,
      lng: e.lon,
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 5);
}
