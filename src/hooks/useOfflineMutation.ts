import { useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { enqueue, type QueueOperation } from '@/services/offline/queue';

export function useOfflineMutation() {
  return useCallback(
    async (
      op: QueueOperation,
      onlineHandler: () => Promise<void>,
    ): Promise<{ queued: boolean; error?: unknown }> => {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        try {
          await onlineHandler();
          return { queued: false };
        } catch (err) {
          return { queued: false, error: err };
        }
      }
      await enqueue(op);
      return { queued: true };
    },
    [],
  );
}
