import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useTranslation } from '../../i18n/useTranslation';
import type { RiderSocketState } from '../../hooks/useRiderSocket';

/**
 * P6-3：WS 连接异常红色横幅——与 OfflineBanner 并列（不替代）。
 *   语义区分：OfflineBanner=本地无网（黄），本横幅=有网但 WS 握手/连接失败/持续断开（红，更严重）。
 *   Why：原 useRiderSocket 的 state 从未被消费，断线骑手零感知、错过派单。
 *
 * §四.3+§四.4 修复（独立组件便于单测 src/test/pages/ws-error-banner.test.tsx）：
 *   - 覆盖 `'disconnected'` 持续态（不只 `'error'`）：服务端 graceful disconnect 只 emit disconnect 不 emit connect_error，
 *     socket.io reconnectionAttempts=Infinity 永不耗尽 → connect_error 不再 fire，骑手长时间无感知。故 disconnected 持续 > 3s 也显示。
 *   - debounce：弱网反复 connect/disconnect 时，wsState 在 connected↔error/disconnected 间高频抖动 → Banner 闪烁干扰。
 *     持续异常 > 3s 才显示，恢复 connected 立即隐藏（恢复无需 debounce，尽快给骑手正反馈）。
 *   - 不可手动关闭（重连成功 wsState 切回 connected 自动消失）。
 */
export const WS_BANNER_DEBOUNCE_MS = 3000;

export function WsErrorBanner({ wsState }: { wsState: RiderSocketState }) {
  const { t } = useTranslation();
  // 异常态判定：error=握手/连接失败；disconnected=重连中或服务端断开持续态。connecting 是首连/重连瞬态，不显示。
  const isAbnormal = wsState === 'error' || wsState === 'disconnected';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isAbnormal) {
      // 恢复 connected（或首帧 connecting）立即隐藏，无需 debounce——尽快给骑手「已恢复」正反馈
      /* eslint-disable react-hooks/set-state-in-effect -- 原因：isAbnormal 由外部 wsState 驱动，恢复时需同步清 show 避免残留显示 */
      setShow(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    // 异常持续 > 3s 才显示，过滤重连瞬态与弱网抖动
    const timer = setTimeout(() => setShow(true), WS_BANNER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isAbnormal]);

  if (!show) return null;

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="bg-danger px-4 py-2">
      <Text className="text-center text-sm font-semibold text-white">{t('common.wsDisconnected')}</Text>
    </View>
  );
}
