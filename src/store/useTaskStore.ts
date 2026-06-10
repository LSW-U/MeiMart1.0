import type { DeliveryTask } from '@/src/types/task';

export function useTaskStore() {
  return {
    tasks: [] as DeliveryTask[],
    setTasks: (_tasks: DeliveryTask[]) => undefined,
  };
}
