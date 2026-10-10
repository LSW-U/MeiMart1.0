import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartApi } from '@/services/cart';
import { orderApi } from '@/services/orders';
import { refreshAccessToken } from '@/services/api';
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

/** 单次执行（不刷 token）；401 返回 'auth' 供上层刷 token 重试 */
async function executeOnce(op: QueueOperation): Promise<'ok' | 'auth' | 'fail'> {
  try {
    switch (op.type) {
      case 'add-to-cart': {
        await cartApi.addItemById(op.payload.productId, op.payload.quantity);
        return 'ok';
      }
      case 'update-cart-item': {
        await cartApi.updateItem(op.payload.itemId, op.payload.updates as never);
        return 'ok';
      }
      case 'remove-cart-item': {
        await cartApi.removeItem(op.payload.itemId);
        return 'ok';
      }
      case 'toggle-cart-item': {
        await cartApi.toggleSelect(op.payload.itemId, op.payload.selected);
        return 'ok';
      }
      case 'cancel-order': {
        await orderApi.cancelOrder(op.payload.orderId);
        return 'ok';
      }
      default:
        return 'ok';
    }
  } catch (err) {
    // B-P2-2（D2/D2b）: 错误分型——4xx 业务拒绝弃重放（死信移除），401 交上层刷 token，
    //   网络/5xx/超时保留重放。对齐 rider sync.ts isPermanentStatus + retryAfterTokenRefresh。
    //   不动 throwApiError 全局开关（D2b）：queue 内直接读 axios 原生 err.response?.status。
    const status = readStatus(err);
    if (status === 401) return 'auth';
    if (isPermanentStatus(status)) {
      console.warn('[offline-queue] op permanently rejected, dropped:', op.type, err);
      return 'ok'; // 死信：语义对齐 rider sync.ts permanent（不再占队列）
    }
    console.warn('[offline-queue] op failed, kept for retry:', op.type, err);
    return 'fail';
  }
}

/** axios 原生错误读 status（非 HTTP 错误 → undefined → 可重试） */
function readStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const status = (err as { response?: { status?: number } }).response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** 4xx（含 409/422）= 业务性拒绝，重试不可能改变结果 → 弃重放；
 *   408/429 保留重试（超时/限流非永久）；无 status（网络错/超时）保留重试。
 *   口径与 rider sync.ts 一致；401 在 executeOnce 单独分流，不走此判定。 */
function isPermanentStatus(status: number | undefined): boolean {
  if (status == null) return false;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

/** 401 专用（对齐 rider C17 先例）：显式刷一次 token 后重试原操作——
 *   token 可能在入队后过期。重试成功 → ok；重试仍 401 → 死信（新 token 下仍 401 =
 *   会话已失效，重试无意义）；刷新失败（无 refreshToken/refresh 报错）→ 保留队列，
 *   等下次轮询（onUnauthorized 登出回调接管会话清理）。 */
async function executeOp(op: QueueOperation): Promise<boolean> {
  const first = await executeOnce(op);
  if (first !== 'auth') return first === 'ok';
  try {
    const newToken = await refreshAccessToken();
    if (newToken == null) {
      // 无 refreshToken / refresh 接口报错（包内已吞错转 null + clearAuth）——
      // 保留队列等下次轮询（onUnauthorized 登出回调接管会话清理）
      console.warn('[offline-queue] token refresh unavailable, kept for retry');
      return false;
    }
  } catch (err) {
    console.warn('[offline-queue] token refresh failed, kept for retry:', err);
    return false;
  }
  const second = await executeOnce(op);
  if (second === 'auth') {
    console.warn('[offline-queue] op still 401 after token refresh, dropped:', op.type);
    return true; // 死信
  }
  return second === 'ok';
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
