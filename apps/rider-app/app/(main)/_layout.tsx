import { colors } from "../../src/theme/colors";
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '../../src/store/useAuthStore';
import { useRiderSocket } from '../../src/hooks/useRiderSocket';
import { useCurrentTask } from '../../src/hooks/useCurrentTask';
import { useLocation } from '../../src/hooks/useLocation';
import { useHeartbeat } from '../../src/hooks/useHeartbeat';
import { useBackgroundTask } from '../../src/hooks/useBackgroundTask';
import { useNetworkStore } from '../../src/hooks/useNetworkStore';
import { useRiderSettings } from '../../src/services/queries/useSettings';
import { processQueue } from '../../src/database/sync';
import { OfflineBanner } from '../../src/components/feedback/OfflineBanner';
import { showToast } from '../../src/components/feedback/Toast';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function MainLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Why: 等 hydrate 完成，避免未登录用户看到任务页内容
  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
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
  // P6-1：online 改三态 null|boolean。
  //   - settings 加载失败 → isError=true、data=undefined → online=null（保守不停派单：GPS/心跳继续，避免静默掉线丢派单收入）
  //   - settings 成功且 dutyStatus==='offDuty' → online=false（正常下班）
  //   - 否则 online=true（onDuty/busy）
  // 原 `settings?.dutyStatus !== 'offDuty'` 在 settings=undefined 时得 false → 静默掉线（🔴 致命：停 GPS/心跳/派单）。
  const { data: settings, isError: settingsError } = useRiderSettings();
  const online: boolean | null = settingsError
    ? null
    : settings
      ? settings.dutyStatus !== 'offDuty'
      : null;

  const { socket, state: wsState } = useRiderSocket();
  const { currentOrderId } = useCurrentTask();
  // P6-5（Q3=B）：切单例 store——与 OfflineBanner 共享同一份网络状态（消除首帧 ?? true 双实例不一致）。
  const isOffline = useNetworkStore((s) => s.isOffline);
  const { t } = useTranslation();
  // P6-1：null 收敛为 false（useLocation/useHeartbeat 的 enabled/isOnline 是 boolean）。
  //   null 时不停 GPS/心跳（保守不停派单），用 ?? false 把类型收窄，语义与 false 相同但来源不同。
  useLocation({ socket, currentOrderId, enabled: online ?? false });
  useHeartbeat(online ?? false);

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
    (online ?? false) && !isOffline && Boolean(currentOrderId) && (Platform.OS === 'android' || isBackground);
  useBackgroundTask({ enabled: bgEnabled, currentOrderId });

  // CLAUDE.md 规则 12：online 恢复 + 启动时 flush 离线队列（pickup/deliver/startDelivering 重放）
  // 启动（prev=null）且在线，或 online 恢复（true→false）-> processQueue 补同步崩溃/被杀遗留
  const prevOfflineRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevOfflineRef.current;
    prevOfflineRef.current = isOffline;
    if ((prev === null || prev === true) && !isOffline) {
      // 审查 S4：恢复同步结果反馈（非 fire-and-forget）。failed > 0 提示，骑手知道有 entry 待重试。
      // P6-6：补 .catch——processQueue 内部 try/finally 不会 reject，但 .then 回调里 showToast 或未来改动可能抛，兜底防 unhandledrejection。
      // P6-4：useNetwork 首帧 isConnected=null 经 ?? true 收敛为 isOffline=false，启动时会误触发一次 processQueue。
      //       processQueue 内有 `if (processing) return` 模块锁，重复调用幂等，误触发代价低（空队列直接 0/0），保留现状不额外加网络确认守卫。
      void processQueue()
        .then(({ failed }) => {
          if (failed > 0) showToast(t('common.syncPartialFailed'), 'error');
        })
        .catch((e) => {
          if (__DEV__) console.warn('[processQueue] flush failed:', e);
        });
    }
  }, [isOffline, t]);

  return (
    <View className="flex-1">
      <OfflineBanner />
      {/* P6-3：WS 连接异常红色横幅——与 OfflineBanner 并列（不替代）。
          wsState='error' 时持续显示，不可手动关闭（重连成功自动消失，即 wsState 切回 'connected'）。
          Why：原 useRiderSocket 的 state 从未被消费，断线骑手零感知、错过派单。
          语义区分：OfflineBanner=本地无网（黄），本横幅=有网但 WS 握手/连接失败（红，更严重）。 */}
      {wsState === 'error' ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="bg-danger px-4 py-2">
          <Text className="text-center text-sm font-semibold text-white">{t('common.wsDisconnected')}</Text>
        </View>
      ) : null}
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
