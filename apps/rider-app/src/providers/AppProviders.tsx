import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

import { taskListsKey } from '@/src/services/queries/useTask';
import { initSentry } from '@/src/services/sentry';

initSentry();

const baseQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
    },
    mutations: {
      // 骑手端配送状态上报需要离线队列支持（CLAUDE.md 弱网规则 #12）
      networkMode: 'offlineFirst',
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => baseQueryClient);

  // C11（R-P2-11）：接 onlineManager + AppState active invalidate。
  //   - onlineManager：RQ 感知真实网络态（offlineFirst 模式下断网不空转 refetch，
  //     恢复在线自动重试 pause 的 mutation/query）——原未接时 RQ 永远认为在线。
  //   - AppState → active：原注释声称的「回前台刷新 taskLists」不存在；现补上——
  //     RN 无 window focus 事件（refetchOnWindowFocus 无效），回前台手动 invalidate。
  useEffect(() => {
    onlineManager.setEventListener((setup) =>
      NetInfo.addEventListener((state) => setup(Boolean(state.isConnected ?? false))),
    );
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void client.invalidateQueries({ queryKey: taskListsKey });
    });
    return () => {
      sub.remove();
    };
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
