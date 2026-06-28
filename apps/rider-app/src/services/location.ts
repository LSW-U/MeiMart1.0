import type { Coordinates } from '@/src/types/common';

// 后端没有 POST /location/report 端点（已验证），位置推送全部走 WS（见 useLocation hook）。
// 此 service 仅保留用于 mock 模式本地延迟模拟。
export const locationApi = {
  async report(_coordinates: Coordinates): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 50));
  },
};
