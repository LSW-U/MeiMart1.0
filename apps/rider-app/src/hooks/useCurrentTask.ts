import type { DeliveryTask } from '@/src/types/task';

export function useCurrentTask() {
  return {
    currentTask: null as DeliveryTask | null,
    hasCurrentTask: false,
  };
}
