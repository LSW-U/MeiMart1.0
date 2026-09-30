import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { OfflineQueueEntry } from './models';

/**
 * 批1（D14）真库集成测试基建：每次调用新建独立 SQLiteAdapter + Database 实例。
 *
 * - rn project（testEnvironment: node）下 WMB 0.28 sqlite-node dispatcher 走
 *   better-sqlite3 真库（方案v2 N2 风险解除）。
 * - dbName 必须每用例唯一（unique dbName 隔离），禁共享实例/禁 mock ./index。
 * - NODE_ENV=test 时 WMB 会把无名 dbName 映射为 `file:testdb<tag>?mode=memory&cache=shared`
 *   ——显式传唯一 dbName 则落到 cwd 下 <dbName>.db 文件，测试结束由本工具删除。
 */
let dbSeq = 0;

export function makeTestDatabase(): { database: Database; dbName: string; cleanup: () => void } {
  const dbName = `wmb-sync-test-${++dbSeq}-${Date.now()}`;
  const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName,
    jsi: false,
  });
  const database = new Database({
    adapter,
    modelClasses: [OfflineQueueEntry],
  });
  const cleanup = (): void => {
    // 清落盘文件（node 通道 dbName 显式时写 <cwd>/<dbName>.db）
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 原因：node 测试环境专用 fs，ESM import 拉不进 jest 模块图且 tsconfig types 未含 node
    const fs = require('fs') as { unlinkSync: (path: string) => void };
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      try {
        fs.unlinkSync(`${dbName}.db${suffix}`);
      } catch {
        // 文件不存在即目标已达成
      }
    }
  };
  return { database, dbName, cleanup };
}
