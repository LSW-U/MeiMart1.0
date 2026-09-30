import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * 批1 schema v2 定稿（方案v2 R-P0-1 + R-P1-5 + R-P1-6 一次到位）：
 *   - offline_queue 拆 task_id 独立列（去重不再 JSON.parse payload 全表扫）
 *   - created_at/task_id/action 三个索引（WMB 0.28 索引唯一通道是列级 isIndexed: true，
 *     自动生成 `create index if not exists <table>_<column>`；无 tableSchema indexes 字段、
 *     无 enableIndexes 迁移步骤——已核 node_modules 源码 encodeSchema/index.js）
 *   - version 1→2 走 migrations（schemaMigrations addColumn + enableIndexes），
 *     老库（Loki 时代无本地库，SQLite 新装）与升级库统一由 adapter 初始化路径处理。
 *
 * 批3 C1（v3）：删除 tasks/orders 死表（全仓 0 次 get('tasks')/get('orders')，
 * 仅 modelClasses 注册——D8）。
 *   - 删前 grep 0 引用证据见批3 执行日志
 *   - 老库存量两表由 migration 2→3 drop table if exists 回收（WMB 无 dropTables
 *     步骤类型——已核 encodeMigrationSteps 仅支持 create_table/add_columns/sql，
 *     走 unsafeExecuteSql；「if exists」保证新装库（从未建过两表）幂等通过）
 */
export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'offline_queue',
      columns: [
        { name: 'action', type: 'string', isIndexed: true },
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'payload', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
      ],
    }),
  ],
});
