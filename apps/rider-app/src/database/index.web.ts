// web 版数据库（方案 A：平台分文件，Metro 按扩展名解析 .web.ts）
//
// WatermelonDB SQLiteAdapter 仅有原生实现（sqlite-node 依赖 Node fs/better-sqlite3），
// web bundle 加载即崩 `promisify is not a function`。web 预览退回 LokiJSAdapter
// （IndexedDB 持久化），不承载离线队列落盘场景——离线队列只在真机用。
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { schema } from './schema';
import { migrations } from './migrations';
import { OfflineQueueEntry } from './models';

const adapter = new LokiJSAdapter({
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

export const database = new Database({
  adapter,
  modelClasses: [OfflineQueueEntry],
});

export type AppDatabase = typeof database;
