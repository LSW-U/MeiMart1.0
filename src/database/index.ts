import Database from '@nozbe/watermelondb/Database';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import { schema } from './schema';
import { Task, Order, OfflineQueueEntry } from './models';

const adapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

export const database = new Database({
  adapter,
  modelClasses: [Task, Order, OfflineQueueEntry],
});

export type AppDatabase = typeof database;
