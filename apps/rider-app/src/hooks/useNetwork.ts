import { useNetworkStore } from './useNetworkStore';

/**
 * C4（R-P2-4）：useNetwork 全部收敛 useNetworkStore 语义。
 *
 * Why：原实现是 per-hook useState + `isConnected ?? true` 首帧收敛——首帧 NetInfo 未确认时
 *   误判在线（accept 放行 / 该入队走真 API），与 store 的 null（未确认）语义矛盾，8 处调用方
 *   各持一份订阅 + state 也是净浪费（NetInfo 内部单例广播）。
 *
 * 收敛后：全部 8 处调用点共享 store 单例（init 由 root _layout 常驻注册）。
 *   - isOffline: boolean | null——null = 首帧未确认（不再 `?? true` 假装在线）。
 *     现有 8 处消费全是 `if (isOffline)` 守卫，null 为 falsy → 不触发离线分支，
 *     与「未确认 ≠ 断网，不阻断」的保守语义一致（对齐 useNetworkStore §P6-4 注释）。
 *   - isConnected 保留返回（类型 boolean | null），调用方按需守卫。
 */
export function useNetwork() {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const isOffline = useNetworkStore((s) => s.isOffline);
  return { isConnected, isOffline };
}
