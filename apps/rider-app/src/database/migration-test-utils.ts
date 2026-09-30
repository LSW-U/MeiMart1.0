import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { OfflineQueueEntry } from './models';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- 原因：node 测试环境专用 better-sqlite3 直造/直查 sqlite 库文件，ESM import 拉不进 jest 模块图
const DatabaseNative = require('better-sqlite3') as new (path: string) => {
  pragma: (source: string, options?: { simple: boolean }) => unknown;
  exec: (sql: string) => unknown;
  prepare: (sql: string) => {
    run: (args?: unknown[]) => unknown;
    all: (args?: unknown[]) => Record<string, unknown>[];
  };
  close: () => void;
};

/**
 * P2-4：1→2→3 迁移升级链真库测试。
 *
 * 造老库方式（已核 WMB 0.28 node 桥源码 sqlite-node/DatabaseDriver.js + DatabaseBridge.js）：
 *   adapter initialize → isCompatible 比较 user_version（0<db<schemaVersion 抛
 *   MigrationNeededError）→ migrations_needed → stepsForMigration(1→3) →
 *   driver.migrate 断言 migrations.from === userVersion 后 executeStatements + userVersion=3。
 * 故测试只需 better-sqlite3 直接造一个 user_version=1 的老库文件（v1 形态：offline_queue
 * 无 task_id 列/索引 + tasks/orders 两死表；id/_changed/_status 为 encodeSchema
 * standardColumns，v1 时代即有），再以生产 schema v3 + 生产 migrations 重开即触发升级链。
 *
 * 不用 WMB adapter 造老库的原因：node 桥无公开 close API（DatabaseDriver/adapter 层
 * 均未导出），连接残留会阻断 better-sqlite3 直查与文件清理。
 */

const LEGACY_ENTRY_ID = 'legacy-entry-1';

/** v1 形态老库：offline_queue（无 task_id 列/索引）+ tasks/orders 两死表，user_version=1 */
function createLegacyDatabaseFile(dbName: string): void {
  const db = new DatabaseNative(`${dbName}.db`);
  db.exec(`
    create table "tasks" ("id" primary key, "_changed", "_status", "order_id", "status", "fee", "created_at", "updated_at");
    create table "orders" ("id" primary key, "_changed", "_status", "order_no", "status", "completed_at");
    create table "offline_queue" ("id" primary key, "_changed", "_status", "action", "payload", "created_at", "attempts", "last_error");
  `);
  // 存量活条目（v1 无 task_id 列可写；_status '' / _changed '' 与 WMB 写入形态一致）
  db.prepare(
    'insert into "offline_queue" ("id", "_changed", "_status", "action", "payload", "created_at", "attempts") values (?, ?, ?, ?, ?, ?, ?)',
  ).run([LEGACY_ENTRY_ID, '', '', 'pickup', JSON.stringify({ taskId: 'LEGACY-1' }), Date.now(), 0]);
  db.pragma('user_version = 1');
  db.close();
}

function withNativeDb<T>(dbName: string, fn: (db: InstanceType<typeof DatabaseNative>) => T): T {
  const db = new DatabaseNative(`${dbName}.db`);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/** user_version 读取（迁移执行后应为 3；WMB Database.js 同款 pragma simple 读法） */
function readUserVersion(dbName: string): number {
  return withNativeDb(dbName, (db) => db.pragma('user_version', { simple: true }) as number);
}

/** sqlite_master 表名列表 */
function readTableNames(dbName: string): string[] {
  return withNativeDb(dbName, (db) =>
    db
      .prepare("select name from sqlite_master where type = 'table'")
      .all()
      .map((r) => String(r.name)),
  );
}

/** sqlite_master 索引名列表 */
function readIndexNames(dbName: string): string[] {
  return withNativeDb(dbName, (db) =>
    db
      .prepare("select name from sqlite_master where type = 'index'")
      .all()
      .map((r) => String(r.name)),
  );
}

/**
 * 造 user_version=1 老库文件 → 以生产 schema v3 + 生产 migrations 重开（触发 1→2→3 升级链）。
 * 返回迁移后的 database 与断言辅助；cleanup 删库文件（含 journal/wal/shm）。
 */
export async function makeMigratedDatabase(): Promise<{
  database: Database;
  dbName: string;
  legacyEntryId: string;
  readUserVersion: () => number;
  readTableNames: () => string[];
  readIndexNames: () => string[];
  cleanup: () => void;
}> {
  const dbName = `wmb-mig-test-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  createLegacyDatabaseFile(dbName);

  // 以生产 schema+migrations 重开：user_version 1 < 3 → MigrationNeededError → 自动跑 1→2→3
  const adapter = new SQLiteAdapter({ schema, migrations, dbName, jsi: false });
  const database = new Database({ adapter, modelClasses: [OfflineQueueEntry] });

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 原因：node 测试环境专用 fs
  const fs = require('fs') as { unlinkSync: (path: string) => void };
  const cleanup = (): void => {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      try {
        fs.unlinkSync(`${dbName}.db${suffix}`);
      } catch {
        // 文件不存在即目标已达成
      }
    }
  };

  return {
    database,
    dbName,
    legacyEntryId: LEGACY_ENTRY_ID,
    readUserVersion: () => readUserVersion(dbName),
    readTableNames: () => readTableNames(dbName),
    readIndexNames: () => readIndexNames(dbName),
    cleanup,
  };
}
