import { Database } from '@nozbe/watermelondb';

import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { OfflineQueueEntry } from './models';

/**
 * R-P0-1：LokiJSAdapter → SQLiteAdapter（仅原生端）。
 *
 * 旧 LokiJSAdapter 在 RN 原生端无 indexedDB → 内存库，杀进程离线队列/缓存全丢。
 * WMB 0.28 SQLiteAdapter 原生端走自带 native module（ios FMDB / android sqlite），
 * 非 expo-sqlite 依赖。jsi: false 走异步 dispatcher（Fabric 兼容保守档），
 * 真机冒烟（方案v2 N3）通过后再评估 jsi: true。
 *
 * web 端：SQLiteAdapter 的 sqlite-node 分支依赖 Node fs/better-sqlite3，
 * web bundle 加载即崩（promisify is not a function）→ web 走 database.web.ts
 * （LokiJSAdapter + IndexedDB）。Metro 按平台扩展名解析，index.ts 只留原生实现。
 */
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'mei-delivery',
  jsi: false,
});

export const database = new Database({
  adapter,
  modelClasses: [OfflineQueueEntry],
});

export type AppDatabase = typeof database;
