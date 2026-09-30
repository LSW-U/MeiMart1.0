import { useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { enqueue, type QueueOperation } from '@/services/offline/queue';

/**
 * C-P2-13: 在线判据与 C-P2-12 三态口径一致——isInternetReachable null（探测中/无法探测）
 * 是「未知」按在线处理（reachableOrUnknown），只有 isConnected === false 才走离线入队。
 *
 * 在线路径的 onlineHandler 失败也必须入队重试（不静默丢操作）：返回 { queued: true, error }
 * 让调用方知道操作已入队但本次执行失败（如 5xx/超时），网络恢复后 processQueue 会重放。
 * 仅业务性拒绝（调用方自行判断，如 SOLD_OUT）不希望入队时，抛带 name === 'BusinessError'
 * 的错误——此处原样返回不入队。业务 4xx 确定性失败不入队的生产者约定见批3。
 */
export function useOfflineMutation() {
  return useCallback(
    async (
      op: QueueOperation,
      onlineHandler: () => Promise<void>,
    ): Promise<{ queued: boolean; error?: unknown }> => {
      const net = await NetInfo.fetch();
      // 三态：isConnected false = 离线 → 入队；true/null（未知）→ 在线直发
      if (net.isConnected === false) {
        await enqueue(op);
        return { queued: true };
      }
      try {
        await onlineHandler();
        return { queued: false };
      } catch (err) {
        // 业务性拒绝（库存不足/已售罄等）不入队——重试也不会成功
        if (err instanceof Error && err.name === 'BusinessError') {
          return { queued: false, error: err };
        }
        // 网络失败/5xx → 入队重试，不静默丢操作
        await enqueue(op);
        return { queued: true, error: err };
      }
    },
    [],
  );
}
