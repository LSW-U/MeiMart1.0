/**
 * Behavior Tracking — 行为埋点批量上报（客户画像批5 G2，方案v2 §三 批5 2026-10-18）
 *
 * 契约（MeiMart behavior.controller.ts）：POST /client/behavior-events
 *   { events: [{ productId, type: 'VIEW'|'SEARCH_CLICK', at?: ISO }] }，≤100 条/批，
 *   OptionalAuth 匿名可报；服务端异步写入不阻塞、失败降级只丢埋点（永远 200）。
 *
 * 客户端策略（R-c 同源，任务书批5 前端节）：
 *   - 本地队列攒批：30s 定时 flush 或攒满 20 条即 flush（减少弱网请求数）
 *   - fire-and-forget：flush 失败静默吞（埋点可丢，绝不影响业务主流程、不弹错）
 *   - 单批超 100 条截断：只上报前 100，余量留队列等下轮（对齐后端 BEHAVIOR_BATCH_MAX）
 *   - mock 模式 no-op（埋点无 UI 消费，演示环境不产生网络噪音）
 */
import { api, isMockMode } from './api';

/** 与后端 BEHAVIOR_EVENT_TYPES / BEHAVIOR_BATCH_MAX 对齐 */
export type BehaviorEventType = 'VIEW' | 'SEARCH_CLICK';
const BATCH_MAX = 100;

/** 攒批阈值：满 20 条立即 flush（不等 30s 定时） */
const FLUSH_THRESHOLD = 20;
/** 定时 flush 间隔 */
const FLUSH_INTERVAL_MS = 30_000;

interface BehaviorEventItem {
  productId: string;
  type: BehaviorEventType;
  /** 客户端事件时间（ISO；服务端当前以 createdAt 为准，透传留消费侧扩展） */
  at: string;
}

let queue: BehaviorEventItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** 重入守卫：一次 flush 在途时后续触发跳过（post 落地后余量由续期定时器兜底） */
let flushing = false;

/** 真实上报（service 内部；失败由调用方静默吞） */
async function postBatch(events: BehaviorEventItem[]): Promise<void> {
  await api.post('/client/behavior-events', { events });
}

/**
 * flush：上报当前队列（≤100/批；成功后余量立即续批清空，失败整批留队）。
 * 返回本次累计成功上报条数（测试断言用；生产调用方不消费）。
 */
export async function flushBehaviorEvents(): Promise<number> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0 || flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    // 续批清空：单批 ≤100（后端 BEHAVIOR_BATCH_MAX），成功即续发余量（弱网下合并为一次触发）
    while (queue.length > 0) {
      const batch = queue.slice(0, BATCH_MAX);
      try {
        await postBatch(batch);
        queue = queue.slice(batch.length);
        sent += batch.length;
      } catch {
        // fire-and-forget：失败静默（埋点可丢），余量留队等下轮定时重试
        break;
      }
    }
    return sent;
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    void flushBehaviorEvents();
  }, FLUSH_INTERVAL_MS);
}

/**
 * 埋点入队（fire-and-forget；攒满 20 条立即 flush，否则等 30s 定时）。
 * mock 模式 no-op。永不 throw。
 */
export function trackBehaviorEvent(type: BehaviorEventType, productId: string): void {
  if (isMockMode || !productId) return;
  queue.push({ productId, type, at: new Date().toISOString() });
  if (queue.length >= FLUSH_THRESHOLD) {
    void flushBehaviorEvents();
  } else {
    scheduleFlush();
  }
}

/** 便捷语义封装：商品详情浏览（进详情页即报） */
export function trackProductView(productId: string): void {
  trackBehaviorEvent('VIEW', productId);
}

/** 便捷语义封装：搜索结果点击 */
export function trackSearchClick(productId: string): void {
  trackBehaviorEvent('SEARCH_CLICK', productId);
}

/** 测试隔离：清队列 + 取消定时（jest beforeEach 用） */
export function resetBehaviorQueueForTest(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  queue = [];
  flushing = false;
}
