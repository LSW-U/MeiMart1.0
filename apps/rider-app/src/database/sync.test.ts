import {
  enqueue,
  processQueue,
  dispatchAction,
  getQueueSize,
  getDeadCount,
  purgeFailedEntries,
} from './sync';
import { makeTestDatabase } from './test-utils';
import * as indexModule from './index';
import type { OfflineQueueEntry } from './models';

import { ApiError, refreshAccessToken } from '../services/api';
import { taskApi } from '../services/task';
import {
  uploadEvidence,
  deleteEvidenceFile,
  uploadEvidenceCached,
  forgetUploadedUrl,
  clearEvidenceDir,
} from '../services/evidence';

/**
 * sync 真库集成测试（批1 A1，D14 形态）——CLAUDE.md 规则 12 离线队列消费器。
 *
 * 旧测试 fake db（write: fn=>fn() + jest.Mock entry）掩盖了 R-P0-2：processQueue 的
 * markAsDeleted/update 在 database.write 之外，WMB 0.28 writer 断言必抛，队列
 * 「入得队、永远消费不了」。本文件全部用例跑 SQLite 真库（sqlite-node dispatcher +
 * better-sqlite3，方案v2 N2），每用例独立 Database 实例（unique dbName 隔离），
 * 禁 mock ./index、禁 write:fn=>fn()。
 *
 * dispatchAction 仍 mock taskApi（网络层，非本批被测对象）。
 * 批2 R-P1-2/R-P1-3：evidence 上传服务 mock（uploadEvidence 短路为已传状态）；
 *   新增 permanent 分型立即死信 / getDeadCount / evidence 先传后报 用例。
 */

// P2-5（C17 401 链）：部分 mock——保留真 ApiError（instanceof 分型依赖），仅 mock
// refreshAccessToken（网络层，被测对象是 sync 的「401→刷新→重试」编排）
jest.mock('../services/api', () => ({
  __esModule: true,
  ApiError: jest.requireActual('../services/api').ApiError,
  refreshAccessToken: jest.fn(),
}));

jest.mock('../services/task', () => ({
  taskApi: {
    pickup: jest.fn(),
    startDelivering: jest.fn(),
    deliver: jest.fn(),
  },
}));

jest.mock('../services/evidence', () => ({
  uploadEvidence: jest.fn(async () => ({})),
  // uploadEvidenceCached：无缓存场景直透传底层 uploadEvidence（单文件用例语义一致）
  uploadEvidenceCached: jest.fn(async (evidence?: Record<string, string>) => ({
    ...evidence,
    ...(evidence
      ? Object.fromEntries(Object.keys(evidence).map((k) => [k, `https://mock-url/${k}.jpg`]))
      : {}),
  })),
  deleteEvidenceFile: jest.fn(),
  forgetUploadedUrl: jest.fn(),
  clearEvidenceDir: jest.fn(),
}));

const mockUploadEvidence = uploadEvidence as jest.Mock;
const mockDeleteEvidenceFile = deleteEvidenceFile as jest.Mock;
const mockUploadEvidenceCached = uploadEvidenceCached as jest.Mock;
const mockForgetUploadedUrl = forgetUploadedUrl as jest.Mock;
const mockClearEvidenceDir = clearEvidenceDir as jest.Mock;

// D14 真库基座：不 mock write 语义，只把 ./index 的 database 导出重定向到每用例
// 独立的真实 SQLite 实例（test-utils 造库）——sync.ts 的 enqueue/processQueue 全部
// 跑在该真库上，writer 断言、软删、落盘全为真。getter 形态让 beforeEach 重绑生效。
jest.mock('./index', () => {
  const state = { database: null as unknown };
  return {
    __esModule: true,
    set database(db: unknown) {
      state.database = db;
    },
    get database() {
      return state.database;
    },
  };
});

const mockRefreshAccessToken = refreshAccessToken as jest.Mock;

const mockPickup = taskApi.pickup as jest.Mock;
const mockStartDelivering = taskApi.startDelivering as jest.Mock;
const mockDeliver = taskApi.deliver as jest.Mock;

type Ctx = ReturnType<typeof makeTestDatabase>;
let ctx: Ctx;

beforeEach(() => {
  mockPickup.mockReset().mockResolvedValue(undefined);
  mockStartDelivering.mockReset().mockResolvedValue(undefined);
  mockDeliver.mockReset().mockResolvedValue(undefined);
  mockUploadEvidence.mockReset().mockResolvedValue({});
  mockUploadEvidenceCached
    .mockReset()
    .mockImplementation(async (evidence?: Record<string, string>) =>
      Object.fromEntries(Object.keys(evidence ?? {}).map((k) => [k, `https://mock-url/${k}.jpg`])),
    );
  mockDeleteEvidenceFile.mockReset();
  mockForgetUploadedUrl.mockReset();
  mockClearEvidenceDir.mockReset();
  mockRefreshAccessToken.mockReset().mockResolvedValue(undefined);
  ctx = makeTestDatabase();
  (indexModule as { database: unknown }).database = ctx.database;
});

afterEach(() => {
  ctx.cleanup();
});

async function fetchEntries(): Promise<OfflineQueueEntry[]> {
  // fetch 含软删项需 query().fetch()；WMB 默认排除软删，这里直接取活条目
  return ctx.database.get<OfflineQueueEntry>('offline_queue').query().fetch();
}

/** 先红后绿取证基座：processQueue 在未包 write 的旧实现下应抛 writer 断言 */
describe('processQueue（真库）', () => {
  it('R-P0-2 回归：成功消费 markAsDeleted 在 write 内——enqueue→processQueue→条目软删', async () => {
    await enqueue({ type: 'pickup', payload: { taskId: 'T1' } });
    await enqueue({ type: 'deliver', payload: { taskId: 'T1', collectedAmount: 50 } });

    const result = await processQueue();

    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(mockPickup).toHaveBeenCalledWith('T1', undefined);
    expect(mockDeliver).toHaveBeenCalledWith('T1', { collectedAmount: 50, note: undefined });
    expect(await getQueueSize()).toBe(0); // 软删后 query().fetch() 排除，活条目为 0
  });

  it('R-P0-2 回归：失败 attempts/lastError 经 entry.update 在 write 内真实落盘', async () => {
    mockPickup.mockRejectedValue(new Error('network down'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T2' } });

    const result = await processQueue();

    expect(result).toEqual({ synced: 0, failed: 1 });
    const entries = await fetchEntries();
    // 查询排除软删，但失败条目未删，仍可见且 attempts 落盘
    expect(entries).toHaveLength(1);
    expect(entries[0].attempts).toBe(1);
    expect(entries[0].lastError).toBe('network down');
  });

  it('attempts 累计至死信：MAX_ATTEMPTS(5) 后不再 dispatch、计入 failed', async () => {
    mockPickup.mockRejectedValue(new Error('still down'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T3' } });

    // 连跑 5 轮失败 -> attempts=5（死信）
    for (let i = 0; i < 5; i++) {
      const r = await processQueue();
      expect(r).toEqual({ synced: 0, failed: 1 });
    }
    // 第 6 轮：死信跳过（不 dispatch），仍计 failed
    mockPickup.mockClear();
    const r6 = await processQueue();
    expect(r6).toEqual({ synced: 0, failed: 1 });
    expect(mockPickup).not.toHaveBeenCalled();
  });

  it('重复 flush 幂等：空队列再跑 processQueue 返回 0/0，无副作用', async () => {
    await enqueue({ type: 'pickup', payload: { taskId: 'T4' } });
    await processQueue();

    const again = await processQueue();
    expect(again).toEqual({ synced: 0, failed: 0 });
    expect(mockPickup).toHaveBeenCalledTimes(1);
  });

  it('审查 S6 回归：同 taskId 前序失败，后序本轮跳过（真库条目顺序语义）', async () => {
    mockPickup.mockRejectedValue(new Error('pickup 500'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T5' } });
    await enqueue({ type: 'deliver', payload: { taskId: 'T5' } });

    const result = await processQueue();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(mockDeliver).not.toHaveBeenCalled();
  });

  it('R-P2-13 回归：损坏 payload 的历史条目被跳过不炸整轮（attempts+1 落盘）', async () => {
    // 模拟旧版/Loki 时代写入的坏行：绕过 enqueue 直插 task_id 空串 + 损坏 payload
    await ctx.database.write(async () => {
      await ctx.database.get<OfflineQueueEntry>('offline_queue').create((entry) => {
        entry.action = 'pickup';
        entry.taskId = 'corrupted-legacy';
        entry.payload = '{not-json';
        entry.attempts = 0;
      });
    });

    const result = await processQueue();

    // 坏条目进 catch 计 failed，不阻断后续；本轮无其他条目 -> failed=1
    expect(result).toEqual({ synced: 0, failed: 1 });
    const entries = await fetchEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].attempts).toBe(1);
  });
});

describe('enqueue（真库）', () => {
  it('正常入队：task_id 列写入 + FIFO createdAt', async () => {
    await enqueue({ type: 'pickup', payload: { taskId: 'T6', note: 'n1' } });

    const entries = await fetchEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].taskId).toBe('T6');
    expect(entries[0].action).toBe('pickup');
    expect(JSON.parse(entries[0].payload)).toEqual({ taskId: 'T6', note: 'n1' });
  });

  it('审查 M2 去重：同 taskId+action 未超限 -> 不重复 create', async () => {
    await enqueue({ type: 'pickup', payload: { taskId: 'T7' } });
    await enqueue({ type: 'pickup', payload: { taskId: 'T7' } });

    expect(await getQueueSize()).toBe(1);
  });

  it('去重例外：死信（attempts>=MAX）允许新建；不同 action 不互斥', async () => {
    mockPickup.mockRejectedValue(new Error('x'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T8' } });
    for (let i = 0; i < 5; i++) await processQueue(); // 打成死信
    mockPickup.mockResolvedValue(undefined);

    await enqueue({ type: 'pickup', payload: { taskId: 'T8' } });
    expect(await getQueueSize()).toBe(2);

    await enqueue({ type: 'deliver', payload: { taskId: 'T8' } });
    expect(await getQueueSize()).toBe(3);
  });
});

describe('dispatchAction 路由（保持旧覆盖，bug 1 端点对齐）', () => {
  it('pickup/startDelivering/deliver 各路由到 taskApi 对应方法', async () => {
    await dispatchAction({ type: 'pickup', payload: { taskId: 'A', note: 'arrived' } });
    await dispatchAction({ type: 'startDelivering', payload: { taskId: 'B' } });
    await dispatchAction({
      type: 'deliver',
      payload: { taskId: 'C', collectedAmount: 100, note: 'cash' },
    });

    expect(mockPickup).toHaveBeenCalledWith('A', 'arrived');
    expect(mockStartDelivering).toHaveBeenCalledWith('B', undefined);
    expect(mockDeliver).toHaveBeenCalledWith('C', { collectedAmount: 100, note: 'cash' });
  });
});

describe('R-P1-2/R-P1-3：evidence 链 + permanent 分型', () => {
  it('R-P1-2：带 evidence 的 pickup——先 uploadEvidenceCached 拿 URL 再报状态，成功后删本地文件+回收缓存', async () => {
    mockUploadEvidenceCached.mockResolvedValue({ photoUri: 'https://cdn/x.jpg' });
    await dispatchAction({
      type: 'pickup',
      payload: { taskId: 'A', evidence: { photoUri: 'file://p/1.jpg' } },
    });

    expect(mockUploadEvidenceCached).toHaveBeenCalledWith({ photoUri: 'file://p/1.jpg' });
    expect(mockPickup).toHaveBeenCalledTimes(1);
    expect(mockDeleteEvidenceFile).toHaveBeenCalledWith('file://p/1.jpg');
    expect(mockForgetUploadedUrl).toHaveBeenCalledWith('file://p/1.jpg');
  });

  it('R-P1-2：pickup 无 evidence——不调 uploadEvidenceCached、不删文件', async () => {
    await dispatchAction({ type: 'pickup', payload: { taskId: 'A' } });
    expect(mockUploadEvidenceCached).not.toHaveBeenCalled();
    expect(mockDeleteEvidenceFile).not.toHaveBeenCalled();
  });

  it('R-P1-3：ApiError 422（业务拒绝）→ PermanentSyncError 立即死信（1 轮即 attempts=MAX）', async () => {
    mockPickup.mockRejectedValue(new ApiError(422, 'STATE', 'task not in ASSIGNED'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T9' } });

    const r = await processQueue();
    expect(r).toEqual({ synced: 0, failed: 1 });

    const entries = await fetchEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].attempts).toBe(5); // MAX_ATTEMPTS，不再重试
    expect(entries[0].lastError).toContain('permanent: ');
    expect(entries[0].lastError).toContain('422');

    // 死信不重试：再跑一轮 taskApi 不被调
    mockPickup.mockClear();
    await processQueue();
    expect(mockPickup).not.toHaveBeenCalled();
  });

  it('R-P1-3：4xx 例外——408/429/5xx/网络错误仍是 retryable（attempts+1）', async () => {
    mockPickup.mockRejectedValueOnce(new ApiError(429, 'RATE', 'slow down'));
    mockPickup.mockRejectedValueOnce(new ApiError(500, 'SRV', 'server error'));
    mockPickup.mockRejectedValueOnce(new Error('network down'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T10' } });

    await processQueue();
    await processQueue();
    await processQueue();

    const entries = await fetchEntries();
    expect(entries[0].attempts).toBe(3); // 非 permanent：逐轮 +1
    expect(entries[0].lastError).toBe('network down'); // 无 permanent 前缀
  });

  it('R-P1-3：getDeadCount 统计 attempts>=MAX 的活条目', async () => {
    expect(await getDeadCount()).toBe(0);
    mockPickup.mockRejectedValue(new ApiError(409, 'RACE', 'conflict'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T11' } });
    await processQueue(); // permanent → 立即死信
    expect(await getDeadCount()).toBe(1);
  });

  it('P2-3/P2-6：purgeFailedEntries 放弃死信时逐条回收其证据文件，不误删活条目', async () => {
    mockPickup.mockRejectedValue(new ApiError(422, 'STATE', 'rejected'));
    await enqueue({
      type: 'pickup',
      payload: { taskId: 'T12', evidence: { photoUri: 'file://p/orphan.jpg' } },
    });
    await processQueue(); // 死信
    expect(mockDeleteEvidenceFile).not.toHaveBeenCalled(); // 死信时不清（文件保留给重试视图）

    const purged = await purgeFailedEntries();
    expect(purged).toBe(1);
    // P2-6：只删死信条目自己的文件（不再整目录 clearEvidenceDir——活条目文件不受影响）
    expect(mockDeleteEvidenceFile).toHaveBeenCalledWith('file://p/orphan.jpg');
    expect(mockForgetUploadedUrl).toHaveBeenCalledWith('file://p/orphan.jpg');
    expect(mockClearEvidenceDir).not.toHaveBeenCalled();
  });

  it('P2-6：purge 死信与活条目共存——活条目的 evidence 文件不被回收', async () => {
    // pickup 死信（422 permanent）
    mockPickup.mockRejectedValueOnce(new ApiError(422, 'STATE', 'rejected'));
    await enqueue({
      type: 'pickup',
      payload: { taskId: 'T13', evidence: { photoUri: 'file://p/dead.jpg' } },
    });
    await processQueue();

    // deliver 活条目（网络错误，attempts=1 < MAX）
    mockPickup.mockReset().mockRejectedValueOnce(new ApiError(422, 'STATE', 'rejected'));
    mockDeliver.mockRejectedValue(new Error('network down'));
    await enqueue({
      type: 'deliver',
      payload: { taskId: 'T13', evidence: { photoUri: 'file://p/alive.jpg' } },
    });
    await processQueue();

    await purgeFailedEntries();
    // 死信（pickup）文件回收；活条目（deliver）文件保留给重试
    expect(mockDeleteEvidenceFile).toHaveBeenCalledWith('file://p/dead.jpg');
    expect(mockDeleteEvidenceFile).not.toHaveBeenCalledWith('file://p/alive.jpg');
  });
});

describe('P2-5（C17）：401 → token 刷新 → 重试链', () => {
  it('401 先 refreshAccessToken 再重试——重试成功则消费成功（非死信）', async () => {
    mockPickup.mockRejectedValueOnce(new ApiError(401, 'AUTH', 'token expired'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T14' } });

    const result = await processQueue();

    expect(result).toEqual({ synced: 1, failed: 0 });
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockPickup).toHaveBeenCalledTimes(2); // 首次 401 + 刷新后重试
    expect(await getQueueSize()).toBe(0); // 重试成功，条目软删
  });

  it('D13 批4 收紧：401 刷新后重试仍 401 → PermanentSyncError 立即死信（新 token 下仍 401 = 重试无意义）', async () => {
    mockPickup.mockRejectedValue(new ApiError(401, 'AUTH', 'still unauthorized'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T15' } });

    await processQueue();

    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockPickup).toHaveBeenCalledTimes(2);
    const entries = await fetchEntries();
    expect(entries).toHaveLength(1); // 死信保留（软删标记）
    expect(entries[0].attempts).toBe(5); // attempts 拉满 MAX_ATTEMPTS = 不再重试
    expect(entries[0].lastError).toContain('permanent'); // 死信前缀
    expect(entries[0].lastError).toContain('token refreshed but still unauthorized');
  });

  it('refreshAccessToken 本身失败 → 原样抛错走 attempts 重试路径，不炸整轮', async () => {
    mockPickup.mockRejectedValue(new ApiError(401, 'AUTH', 'token expired'));
    mockRefreshAccessToken.mockRejectedValue(new Error('no refresh token'));
    await enqueue({ type: 'pickup', payload: { taskId: 'T16' } });

    const result = await processQueue();

    expect(result).toEqual({ synced: 0, failed: 1 });
    expect(mockPickup).toHaveBeenCalledTimes(1); // 刷新失败，重试未发起
    const entries = await fetchEntries();
    expect(entries[0].attempts).toBe(1); // 401 非 permanent，走重试路径
  });
});
