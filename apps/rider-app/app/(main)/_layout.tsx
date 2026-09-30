import { colors } from '../../src/theme/colors';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, AppState, View } from 'react-native';
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
import { WsErrorBanner } from '../../src/components/feedback/WsErrorBanner';
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
  // P6-4 路径 A：isOffline 改三态 null|boolean。null=NetInfo 首帧未确认（启动瞬态）。
  const isOffline = useNetworkStore((s) => s.isOffline);
  const { t } = useTranslation();
  // R-P1-1（D16）：online 三态保活语义——null（settings 加载失败/未就绪）必须**不停** GPS/心跳，
  //   仅明确 offDuty（online===false）才停。原 `?? false` 把 null 压成 false 直接停，
  //   settings 一次弱网失败 → Redis rider:online 60s TTL 失续 → 判离线丢派单。
  //   （此行旧注释自称「null 时不停」，与代码相反——M2，注释随代码一起纠正。）
  useLocation({ socket, currentOrderId, enabled: online !== false });
  useHeartbeat(online !== false);

  // P0 后台定位（CLAUDE.md 规则 16）：iOS/Android 统一仅「切后台」才启 HTTP 后台任务
  // （R-P1-4 单通道：前台靠 WS；Android foreground service 常驻注册由 AppState 触发即满足）
  const [isBackground, setIsBackground] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setIsBackground(next === 'background' || next === 'inactive');
    });
    return () => sub.remove();
  }, []);

  // 启用条件：在线 + 联网 + 有配送订单 + 仅切后台（R-P1-4 单通道：Android 前台走 WS，
  // 前后台都启 HTTP 会与 useLocation emit 双通道重复上报；iOS 本就仅后台）
  const bgEnabled =
    (online ?? false) && isOffline === false && Boolean(currentOrderId) && isBackground;
  useBackgroundTask({ enabled: bgEnabled, currentOrderId });

  // CLAUDE.md 规则 12：online 恢复 + 启动时 flush 离线队列（pickup/deliver/startDelivering 重放）
  // P6-4 路径 A：仅「明确从断网恢复」（prev===true → isOffline===false）才 flush。
  //   首帧 prev=null 不触发（NetInfo 未确认不误触 processQueue，对齐方案 §10）；null→false 也不触发（未确认→在线非恢复）。
  //   原实现：useNetwork 首帧 ?? true 收敛 isOffline=false，启动时 prev=null 且 !isOffline 为真 → 误触发一次 processQueue。
  const prevOfflineRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevOfflineRef.current;
    prevOfflineRef.current = isOffline;
    if (prev === true && isOffline === false) {
      // 审查 S4：恢复同步结果反馈（非 fire-and-forget）。failed > 0 提示，骑手知道有 entry 待重试。
      // P6-6：补 .catch——processQueue 内部 try/finally 不会 reject，但 .then 回调里 showToast 或未来改动可能抛，兜底防 unhandledrejection。
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
      <WsErrorBanner wsState={wsState} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
