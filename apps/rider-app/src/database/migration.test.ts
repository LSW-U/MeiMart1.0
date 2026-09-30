import { makeMigratedDatabase } from './migration-test-utils';
import { OfflineQueueEntry } from './models';

/**
 * P2-4：1→2→3 迁移升级链真库测试（审查报告 ④）。
 *
 * 生产 migrations（migrations.ts）此前零真库覆盖——drop 死表走 unsafeExecuteSql
 * 字符串，typo/索引缺失只会在真用户升级时炸。本文件用 better-sqlite3 造
 * user_version=1 的老库文件（v1 形态 + 存量条目），以生产 schema v3 + 生产
 * migrations 重开，断言升级链真实执行。
 */

describe('迁移升级链 1→2→3（真库，P2-4）', () => {
  let ctx: Awaited<ReturnType<typeof makeMigratedDatabase>>;

  beforeEach(async () => {
    ctx = await makeMigratedDatabase();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('迁移执行：user_version 1→3', () => {
    expect(ctx.readUserVersion()).toBe(3);
  });

  it('C1：tasks/orders 死表已 drop，offline_queue 保留', () => {
    const tables = ctx.readTableNames();
    expect(tables).toContain('offline_queue');
    expect(tables).not.toContain('tasks');
    expect(tables).not.toContain('orders');
  });

  it('R-P1-5/R-P1-6：offline_queue 补 task_id 列 + 三个索引（task_id/action/created_at）', () => {
    // WMB 直查列结构（PRAGMA table_info 简化：用 sqlite_master + 查询探针）
    const tables = ctx.readTableNames();
    expect(tables).toContain('offline_queue');

    const indexes = ctx.readIndexNames().join('\n');
    expect(indexes).toContain('offline_queue_task_id');
    expect(indexes).toContain('offline_queue_action');
    expect(indexes).toContain('offline_queue_created_at');
  });

  it('存量数据存活：v1 老条目经 v3 model 可读且 taskId 落列', async () => {
    const entry = await ctx.database
      .get<OfflineQueueEntry>('offline_queue')
      .find(ctx.legacyEntryId);
    expect(entry.action).toBe('pickup');
    expect(entry.taskId).toBe(''); // v1 无 task_id 列，迁移补列后为空串默认值
    expect(JSON.parse(entry.payload)).toEqual({ taskId: 'LEGACY-1' });
    expect(entry.attempts).toBe(0);
  });
});
