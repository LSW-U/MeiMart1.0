export function useOfflineQueue() {
  return {
    pendingCount: 0,
    enqueue: async () => undefined,
    flush: async () => undefined,
  };
}
