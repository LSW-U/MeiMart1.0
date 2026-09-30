import { create } from 'zustand';

import type { Coordinates } from '../types/common';
import { DEFAULT_COORDINATES } from '../utils/constants';

/**
 * 骑手坐标 store（D2 批4：删 mock report 通道后的纯坐标壳）。
 *
 * Why 保留 store：useLocation（前台 watch + socket.emit）双写点统一落此处，
 * useLocation.test.tsx 断言坐标直写 store；真实上报走 location.ts 双通道
 * （前台 socket.emit / 后台 reportLocationHttp），store 不再持有上报职责——
 * 原 report() 是无后端端点的 50ms 假上报（LocationTracker 唯一消费方已删）。
 */
type LocationState = {
  coordinates: Coordinates;
  setCoordinates: (coordinates: Coordinates) => void;
};

export const useLocationStore = create<LocationState>((set) => ({
  coordinates: DEFAULT_COORDINATES,
  setCoordinates: (coordinates) => set({ coordinates }),
}));
