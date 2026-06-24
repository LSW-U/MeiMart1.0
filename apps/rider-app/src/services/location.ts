import type { Coordinates } from '@/src/types/common';

import { api, isMockMode } from './api';

// 高频上报（10-15s 一次）的定位接口。不走 React Query mutation 模式
// （mutation 触发 re-render 影响性能），fire-and-forget 直接调即可。
// 后续若需要离线累积上报，可在本层加队列。
function mockDelay(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const locationApi = {
  async report(coordinates: Coordinates): Promise<void> {
    if (isMockMode) {
      return mockDelay();
    }
    await api.post('/location/report', coordinates);
  },
};
