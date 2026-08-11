import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { useEffect, useState } from 'react';

import { useAuthStore } from '../../src/store/useAuthStore';
import { useRiderSocket } from '../../src/hooks/useRiderSocket';
import { useCurrentTask } from '../../src/hooks/useCurrentTask';
import { useLocation } from '../../src/hooks/useLocation';
import { useHeartbeat } from '../../src/hooks/useHeartbeat';
import { useBackgroundTask } from '../../src/hooks/useBackgroundTask';
import { useNetwork } from '../../src/hooks/useNetwork';
import { useRiderSettings } from '../../src/services/queries/useSettings';

export default function MainLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Why: 等 hydrate 完成，避免未登录用户看到任务页内容
  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#720003" />
      </View>
    );
  }

  // Why: 未登录（token 失效/角色不匹配被清除）-> 跳登录页
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Why: 拆内层组件，让 hook 只在已登录时挂载（遵守 hooks 规则：不能在条件 return 后调 hook）
  return <MainContent />;
}

function MainContent() {
  // P11 项 4：WS 连接 + 前台定位上报 + 心跳续期，三者配套
  // online 派生提前：useLocation 和 useHeartbeat 共用同一守卫（B1：offline 停 watch + 停心跳）
  const { data: settings } = useRiderSettings();
  const online = settings?.dutyStatus !== 'offDuty';

  const { socket } = useRiderSocket();
  const { currentOrderId } = useCurrentTask();
  const { isOffline } = useNetwork();
  useLocation({ socket, currentOrderId, enabled: online });
  useHeartbeat(online);

  // P0 后台定位（CLAUDE.md 规则 16）：iOS 切后台 / Android foreground service 始终
  // 仅「配送中」（有 currentOrderId）才启，固定 5s（规则 18 配送档）
  const [isBackground, setIsBackground] = useState(false);
  useEffect(() => {
    // Android foreground service 常驻不依赖 AppState；iOS 需监听切后台才启
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (next) => {
      setIsBackground(next === 'background' || next === 'inactive');
    });
    return () => sub.remove();
  }, []);

  // 启用条件：在线 + 联网 + 有配送订单 + iOS 在后台（Android 始终）
  const bgEnabled =
    online && !isOffline && Boolean(currentOrderId) && (Platform.OS === 'android' || isBackground);
  useBackgroundTask({ enabled: bgEnabled, currentOrderId });

  return <Stack screenOptions={{ headerShown: false }} />;
}
