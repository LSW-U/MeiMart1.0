export function useBackgroundTask() {
  return {
    isRegistered: false,
    register: async () => undefined,
    unregister: async () => undefined,
  };
}
