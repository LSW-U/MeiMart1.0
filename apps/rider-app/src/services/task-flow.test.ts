import type { TaskStatus } from '@/src/types/task';

import { getTaskAction } from './task-flow';
import { makeTask } from './__fixtures__/makeTask';

/**
 * getTaskAction 单测（CLAUDE.md P1 测试基建首测）
 *
 * 选它打头阵：纯函数、零运行时依赖（task-flow.ts 只有 `import type`），
 * 覆盖 status → {labelKey, target} 全分支 + 终态 undefined。
 * 后续若加 status，本测会强制同步加 case（防漏）。
 */

describe('getTaskAction', () => {
  describe('每个非终态 status 映射到唯一 action', () => {
    it('PENDING_ASSIGN → 接单 + 跳取货页（详情页 handleAction 会先 accept 再跳）', () => {
      expect(getTaskAction(makeTask('PENDING_ASSIGN'))).toEqual({
        labelKey: 'tasks.accept',
        target: 'pickup',
      });
    });

    it('ASSIGNED → 已到取货点 + 跳取货页', () => {
      expect(getTaskAction(makeTask('ASSIGNED'))).toEqual({
        labelKey: 'tasks.arrivedPickup',
        target: 'pickup',
      });
    });

    it('PICKED_UP → 开始配送 + 跳导航页（delivery 两步 / return 三步都在 navigate 分流）', () => {
      expect(getTaskAction(makeTask('PICKED_UP'))).toEqual({
        labelKey: 'tasks.startDelivery',
        target: 'navigate',
      });
    });

    it('DELIVERING → 已到送达点 + 跳签收页（仅 return 任务会进）', () => {
      expect(getTaskAction(makeTask('DELIVERING'))).toEqual({
        labelKey: 'tasks.arrivedDelivery',
        target: 'sign',
      });
    });
  });

  describe('终态 status 无 action（详情页 fallback 到 tasks.refresh）', () => {
    it.each<[TaskStatus]>([['DELIVERED'], ['FAILED']])(
      '%s → undefined',
      (status) => {
        expect(getTaskAction(makeTask(status))).toBeUndefined();
      },
    );
  });

  describe('与 taskType 无关（PICKED_UP 不论 delivery/return 都先跳 navigate）', () => {
    // 关键：getTaskAction 故意不看 taskType —— delivery/return 的分流在 navigate 页，
    // 这里若改成按 taskType 返回不同 target，本测会失败，强制同步改 navigate 页逻辑。
    it('PICKED_UP + delivery → navigate', () => {
      expect(getTaskAction(makeTask('PICKED_UP', { taskType: 'delivery' }))?.target).toBe(
        'navigate',
      );
    });

    it('PICKED_UP + return → navigate（同样跳 navigate，分流交给 navigate 页）', () => {
      expect(getTaskAction(makeTask('PICKED_UP', { taskType: 'return' }))?.target).toBe(
        'navigate',
      );
    });
  });
});
