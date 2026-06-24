import { create } from 'zustand';

import { confirmPickup, confirmDelivery } from '../services/delivery';

// B.3.4 清理后 useTaskStore 只保留 confirmPickup/confirmDelivery 两个方法
// （pickup/sign 页用，属 delivery.ts 范围，B.4 迁移到 useDelivery hook 后整个 store 可删）
// lists/hydrate/refresh/getById/hasActive/accept/updateStatus 全部移除：
// - 读：用 useTaskLists / useTask (services/queries/useTask.ts)
// - 写：用 useAcceptTask / useUpdateTaskStatus
// - invalidate：mutation onSettled 自动处理
type TaskState = {
  confirmPickup: (id: string) => Promise<void>;
  confirmDelivery: (id: string) => Promise<void>;
};

export const useTaskStore = create<TaskState>(() => ({
  confirmPickup: async (id) => {
    await confirmPickup(id);
  },
  confirmDelivery: async (id) => {
    await confirmDelivery(id);
  },
}));
