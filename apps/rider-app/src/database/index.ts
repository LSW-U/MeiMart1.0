import { Database } from '@nozbe/watermelondb';

import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { OfflineQueueEntry } from './models';

/**
 * R-P0-1：LokiJSAdapter → SQLiteAdapter。
 *
 * 旧 LokiJSAdapter 在 RN 原生端无 indexedDB → 内存库，杀进程离线队列/缓存全丢。
 * WMB 0.28 SQLiteAdapter 原生端走自带 native module（ios FMDB / android sqlite），
 * 非 expo-sqlite 依赖。jsi: false 走异步 dispatcher（Fabric 兼容保守档），
 * 真机冒烟（方案v2 N3）通过后再评估 jsi: true。
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
