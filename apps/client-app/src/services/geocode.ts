// Geocode service — 后端代理（保证金批A A7 + 批D D1，2026-09-11）
// Why: Nominatim/Overpass 直调收进后端（UA 合规统一走服务端 + 5min 缓存 + 1/s+10/min rate limit），
//      前端只调 GET /common/geo/suggest?q= 与 GET /common/geo/nearby?lat=&lng=。
//      保留 GeoHit {lat,lng,label} / NearbyPlaceResult 形态，唯一消费点 app/address/map.tsx 零改动。
//      后端失败/无结果返回空 items 不抛错（E-COMMON-004 超频除外，上层 catch 降级）。
import { api } from './api';

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

/** 关键词搜索地点（后端 Nominatim 代理，viewbox 限东帝汶），返回 ≤5 条 */
export async function searchPlaces(query: string): Promise<GeoHit[]> {
  // Why: 后端 zod 校验 q 长度 2-500（E-COMMON-001），短于 2 直接返回空（走「无结果」提示而非报错）
  if (query.trim().length < 2) return [];
  const res = await api.get<{ items: GeoHit[] }>('/common/geo/suggest', {
    params: { q: query },
  });
  return res.data.items ?? [];
}

/** 反地理编码：坐标 → 地址文本（后端无 reverse 端点，保留 Nominatim 直调） */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`,
    // Why: Nominatim 使用政策要求可识别 UA（批D 审查 P3-1，删 nominatimHeaders 时连带误删，此处补回）
    { headers: { 'User-Agent': 'MeiMart-client/1.0' } },
  );
  if (!res.ok) throw new Error(`Nominatim reverse ${res.status}`);
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? '';
}

/** 附近位置（后端 Overpass 代理：2km 内带名称节点，Haversine 按距离升序前 5） */
export async function fetchNearbyPlaces(lat: number, lng: number): Promise<NearbyPlaceResult[]> {
  const res = await api.get<{ items: NearbyPlaceResult[] }>('/common/geo/nearby', {
    params: { lat, lng },
  });
  return res.data.items ?? [];
}
