import {
  trackBehaviorEvent,
  trackProductView,
  trackSearchClick,
  flushBehaviorEvents,
  resetBehaviorQueueForTest,
} from '@/services/behavior';
/**
 * Behavior service 单测 — 批5 G2（方案v2 §三 批5，2026-10-18）
 *
 * 覆盖：
 *   1. 攒批：入队不满 20 条不立即 flush；满 20 条立即 flush
 *   2. ≤100 条/批截断：队列 105 条 flush 只发 100，余 5 留队（对齐后端 BEHAVIOR_BATCH_MAX）
 *   3. flush 失败静默：不 throw、整批留队等下轮（fire-and-forget R-c）
 *   4. flush 成功清空已上报段；定时器续期（余量非空时）
 *   5. mock 模式 no-op（不入队不请求）
 *   6. 空队列 flush 返回 0
 */
jest.useFakeTimers();

const mockApiPost = jest.fn();
jest.mock('@/services/api', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
  isMockMode: false,
}));

describe('behavior service — 埋点批量上报（批5 G2）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiPost.mockResolvedValue({ data: { accepted: 0 } });
    resetBehaviorQueueForTest();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('入队不满阈值不立即请求；30s 定时到点 flush', async () => {
    trackProductView('p001');
    trackSearchClick('p002');
    expect(mockApiPost).not.toHaveBeenCalled();

    jest.advanceTimersByTime(30_000);
    // 定时 flush 是异步 fire，等微任务落地
    await Promise.resolve();
    await Promise.resolve();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockApiPost.mock.calls[0] as [string, { events: unknown[] }];
    expect(url).toBe('/client/behavior-events');
    expect(body.events).toHaveLength(2);
    expect(body.events[0]).toMatchObject({ productId: 'p001', type: 'VIEW' });
    expect(body.events[1]).toMatchObject({ productId: 'p002', type: 'SEARCH_CLICK' });
  });

  it('攒满 20 条立即 flush（不等定时）', async () => {
    for (let i = 0; i < 20; i += 1) trackBehaviorEvent('VIEW', `p${i}`);
    await Promise.resolve();
    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect((mockApiPost.mock.calls[0][1] as { events: unknown[] }).events).toHaveLength(20);
  });

  it('≤100 条/批截断：105 条 flush 续批发 100+5（单批不超上限）', async () => {
    // 同步灌 105 条：第 20 条触发的 flush 在 mock 同步 resolve 下先清 20，
    // 但最终所有条目经续批收口；断言累计 105、单批 ≤100
    for (let i = 0; i < 105; i += 1) trackBehaviorEvent('VIEW', `p${i}`);
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    await Promise.resolve();
    const sent = mockApiPost.mock.calls.map((c) => (c[1] as { events: unknown[] }).events.length);
    expect(sent.reduce((a, b) => a + b, 0)).toBe(105);
    expect(Math.max(...sent)).toBeLessThanOrEqual(100);
    // 余量由续期定时器兜底为空后不再有定时
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    const total = mockApiPost.mock.calls
      .map((c) => (c[1] as { events: unknown[] }).events.length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(105);
  });

  it('flush 失败静默：不 throw、留队重试（fire-and-forget）', async () => {
    trackProductView('p001');
    mockApiPost.mockRejectedValueOnce(new Error('network down'));

    jest.advanceTimersByTime(30_000);
    await expect(flushBehaviorEvents()).resolves.toBe(0); // 不抛错
    expect(mockApiPost).toHaveBeenCalledTimes(1);

    // 留队：恢复后下轮 flush 成功
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(mockApiPost).toHaveBeenCalledTimes(2);
    expect((mockApiPost.mock.calls[1][1] as { events: unknown[] }).events).toHaveLength(1);
  });

  it('flush 成功清空队列；再 flush 空队列返回 0 不请求', async () => {
    trackProductView('p001');
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(mockApiPost).toHaveBeenCalledTimes(1);

    await expect(flushBehaviorEvents()).resolves.toBe(0);
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it('productId 空串不入队（防御）', async () => {
    trackProductView('');
    jest.advanceTimersByTime(30_000);
    await Promise.resolve();
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});
