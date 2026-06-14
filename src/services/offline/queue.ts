import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi } from '@/services/cart';
import { orderApi } from '@/services/orders';
import { useAppStore } from '@/store/appStore';

const QUEUE_KEY = 'meimart.offline-queue';

export type QueueOperation =
  | { id: string; type: 'add-to-cart'; payload: { productId: string; quantity: number } }
  | { id: string; type: 'update-cart-item'; payload: { itemId: string; updates: unknown } }
  | { id: string; type: 'remove-cart-item'; payload: { itemId: string } }
  | { id: string; type: 'toggle-cart-item'; payload: { itemId: string; selected: boolean } }
  | { id: string; type: 'cancel-order'; payload: { orderId: string } };

async function readQueue(): Promise<QueueOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueueOperation[]) : [];
}

async function writeQueue(queue: QueueOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  useAppStore.getState().setPendingMutations(queue.length);
}

export async function enqueue(op: QueueOperation): Promise<void> {
  const queue = await readQueue();
  queue.push(op);
  await writeQueue(queue);
}

export async function getQueue(): Promise<QueueOperation[]> {
  return readQueue();
}

export async function clearQueue(): Promise<void> {
  await writeQueue([]);
}

async function executeOp(op: QueueOperation): Promise<boolean> {
  try {
    switch (op.type) {
      case 'add-to-cart': {
        await cartApi.addItemById(op.payload.productId, op.payload.quantity);
        return true;
      }
      case 'update-cart-item': {
        await cartApi.updateItem(op.payload.itemId, op.payload.updates as never);
        return true;
      }
      case 'remove-cart-item': {
        await cartApi.removeItem(op.payload.itemId);
        return true;
      }
      case 'toggle-cart-item': {
        await cartApi.toggleSelect(op.payload.itemId, op.payload.selected);
        return true;
      }
      case 'cancel-order': {
        await orderApi.cancelOrder(op.payload.orderId);
        return true;
      }
      default:
        return true;
    }
  } catch (err) {
    console.warn('[offline-queue] op failed', op.type, err);
    return false;
  }
}

export async function processQueue(): Promise<{ ok: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { ok: 0, failed: 0 };

  const remaining: QueueOperation[] = [];
  let ok = 0;
  let failed = 0;

  for (const op of queue) {
    const success = await executeOp(op);
    if (success) {
      ok++;
    } else {
      failed++;
      remaining.push(op);
    }
  }

  await writeQueue(remaining);
  return { ok, failed };
}
