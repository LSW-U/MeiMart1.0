// Map pick store — 地图选点页 → 地址编辑页的选址回传中转
// Why: expo-router 的 router.back() 无法携带参数，map.tsx（决策 4 选址回传，B3 断裂修复）
//      选点确认后写入此 store 再 back()，edit.tsx 订阅即重渲染并回填 detail/lat/lng（决策 10）。
import { create } from 'zustand';

export interface MapPick {
  lat: number;
  lng: number;
  /** 反地理编码得到的地址文本（可编辑回填 detail） */
  address: string;
  /** 写入时间戳，用于区分「每次新选点」（同坐标重选也要触发回填） */
  pickedAt: number;
}

interface MapPickState {
  pick: MapPick | null;
  setPick: (pick: Omit<MapPick, 'pickedAt'>) => void;
  clear: () => void;
}

export const useMapPickStore = create<MapPickState>((set) => ({
  pick: null,
  setPick: (p) => set({ pick: { ...p, pickedAt: Date.now() } }),
  clear: () => set({ pick: null }),
}));
