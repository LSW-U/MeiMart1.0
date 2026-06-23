import { database } from './index';
import { OfflineQueueEntry } from './models';

type QueueAction = {
  type: string;
  payload: Record<string, unknown>;
};

const MAX_ATTEMPTS = 5;

export async function enqueue(action: QueueAction): Promise<void> {
  await database.write(async () => {
    await database.get<OfflineQueueEntry>('offline_queue').create((entry) => {
      entry.action = action.type;
      entry.payload = JSON.stringify(action.payload);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (entry as any)._raw.created_at = Date.now();
      entry.attempts = 0;
    });
  });
}

export async function processQueue(): Promise<{ synced: number; failed: number }> {
  const entries = await database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetch();

  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      failed++;
      continue;
    }

    try {
      // Dispatch to the appropriate service based on action type
      await dispatchAction(entry.action, JSON.parse(entry.payload) as Record<string, unknown>);
      await database.write(async () => {
        await entry.markAsDeleted();
      });
      synced++;
    } catch (e) {
      await database.write(async () => {
        entry.attempts += 1;
        entry.lastError = e instanceof Error ? e.message : String(e);
      });
      failed++;
    }
  }

  return { synced, failed };
}

async function dispatchAction(
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { request } = await import('../services/api');

  switch (type) {
    case 'acceptTask':
      await request<void>(`/tasks/${payload.id}/accept`, { method: 'POST' });
      break;
    case 'updateTaskStatus':
      await request<void>(`/tasks/${payload.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      });
      break;
    case 'createWithdrawal':
      await request<void>('/earnings/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: payload.amount, method: payload.method }),
      });
      break;
    case 'reportLocation':
      await request<void>('/location/report', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      break;
    default:
      console.warn('[offline-queue] Unknown action type:', type);
  }
}

export async function getQueueSize(): Promise<number> {
  return database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetchCount();
}

export async function purgeFailedEntries(): Promise<number> {
  const entries = await database
    .get<OfflineQueueEntry>('offline_queue')
    .query()
    .fetch();

  let purged = 0;
  await database.write(async () => {
    for (const entry of entries) {
      if (entry.attempts >= MAX_ATTEMPTS) {
        await entry.markAsDeleted();
        purged++;
      }
    }
  });
  return purged;
}