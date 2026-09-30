import { schemaMigrations, unsafeExecuteSql } from '@nozbe/watermelondb/Schema/migrations';

/**
 * 批1 schema 迁移（R-P1-6）：version 1 → 2。
 *   - offline_queue 补 task_id 列（R-P1-5 拆列；isIndexed 走 encodeIndex 自动建索引）
 *   - 补 created_at/action 两个索引（WMB 0.28 无 enableIndexes 迁移步骤——已核
 *     node_modules 源码 encodeMigrationSteps 仅支持 create_table/add_columns/sql，
 *     老库补索引用 sql 步骤；「create index if not exists」与 schema 建表路径幂等）
 *
 * 注：历史版本 1（LokiJSAdapter 时代）无 SQLite 持久化数据（RN 原生端 Loki 无
 * indexedDB 即内存库），此 migration 主要服务 SQLite 早期安装与测试场景。
 *
 * 批3 C1：version 2 → 3 删除 tasks/orders 死表（全仓 0 引用，D8）。
 * WMB encodeMigrationSteps 仅支持 create_table/add_columns/sql 三种步骤类型
 * （无 dropTables——已核 node_modules 源码），drop 走 unsafeExecuteSql；
 * 「if exists」保证从未建过两表的新装库（version 3 直建）迁移路径幂等。
 */
export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        {
          type: 'add_columns',
          table: 'offline_queue',
          columns: [{ name: 'task_id', type: 'string', isIndexed: true }],
        },
        unsafeExecuteSql(
          'create index if not exists "offline_queue_created_at" on "offline_queue" ("created_at");' +
            'create index if not exists "offline_queue_action" on "offline_queue" ("action");',
        ),
      ],
    },
    {
      toVersion: 3,
      steps: [unsafeExecuteSql('drop table if exists "tasks";' + 'drop table if exists "orders";')],
    },
  ],
});
