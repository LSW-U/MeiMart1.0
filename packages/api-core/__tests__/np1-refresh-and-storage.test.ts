/**
 * 第三轮新增代码修复 批1 验收测试（D3：包级单测保两端）
 * ① N-P1-1：refresh 副作用（tokenStorage.set / onTokenRefreshed）抛错 → 不触发 clear+onUnauthorized 登出
 * ② N-P1-2：tokenStorage set/setAccess/clear 写失败静默不抛（对齐 get/getRefresh 读兜底）
 */
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { createApiClient, createTokenStorage } from '../src/http';

function makeStorage(overrides: Partial<{
  setItem: (k: string, v: string) => Promise<void>;
  deleteItem: (k: string) => Promise<void>;
}> = {}) {
  const store = new Map<string, string>();
  const adapter = {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: overrides.setItem ?? (async (k: string, v: string) => void store.set(k, v)),
    deleteItem: overrides.deleteItem ?? (async (k: string) => void store.delete(k)),
  };
  return {
    store,
    tokenStorage: createTokenStorage({ tokenKey: 't.key', refreshKey: 'r.key', adapter }),
  };
}

describe('N-P1-1：refresh 副作用抛错不误登出（D1 方案A）', () => {
  let mock: AxiosMockAdapter;
  afterEach(() => mock.restore());

  it('tokenStorage.set 直接 reject（真触达方案A副作用区）→ 不调 clear/onUnauthorized，reject 传播+槽位复位', async () => {
    // P1-1 审查修复：手写 TokenStorage stub 让 set 抛错——N-P1-2 落地后 createTokenStorage
    // 的 set 内部吞错，经工厂构造永远到不了方案A副作用区（空测，回退实现仍绿）
    const boom = new Error('storage write boom');
    const tokenStorage = {
      get: jest.fn().mockResolvedValue('old-access'),
      set: jest.fn().mockRejectedValueOnce(boom).mockResolvedValue(undefined),
      setAccess: jest.fn().mockResolvedValue(undefined),
      getRefresh: jest.fn().mockResolvedValue('refresh-1'),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const onUnauthorized = jest.fn();
    const onTokenRefreshed = jest.fn();
    const { api, refreshAccessToken } = createApiClient({
      baseURL: 'http://test',
      tokenStorage: tokenStorage as unknown as Parameters<typeof createApiClient>[0]['tokenStorage'],
      onUnauthorized,
      onTokenRefreshed,
    });
    mock = new AxiosMockAdapter(api);
    mock.onPost('/common/auth/refresh').reply(200, {
      success: true,
      data: { accessToken: 'new-access', refreshToken: 'refresh-2' },
    });
    mock.onGet('/biz').replyOnce(401).onGet('/biz').reply(200, { success: true, data: 1 });

    // refresh 请求成功但 set 抛错 → reject 传播（副作用原始 Error，非 401 AxiosError）
    await expect(api.get('/biz')).rejects.toBe(boom);
    expect(onTokenRefreshed).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled(); // 核心：副作用抛错不触发登出
    expect(tokenStorage.clear).not.toHaveBeenCalled(); // 方案A：clear 只在 refresh 请求失败走
    // 槽位已复位（finally）：再次 refresh 重新发起请求，不复用已完成的旧 promise
    mock.onPost('/common/auth/refresh').reply(200, {
      success: true,
      data: { accessToken: 'n3', refreshToken: 'r3' },
    });
    await expect(refreshAccessToken()).resolves.toBe('n3');
  });

  it('onTokenRefreshed 抛错 → 不调 clear/onUnauthorized', async () => {
    const { tokenStorage, store } = makeStorage();
    const onUnauthorized = jest.fn();
    const client = createApiClient({
      baseURL: 'http://test',
      tokenStorage,
      onUnauthorized,
      onTokenRefreshed: () => {
        throw new Error('mirror boom');
      },
    });
    mock = new AxiosMockAdapter(client.api);
    await tokenStorage.set('old', 'refresh-1');
    mock.onPost('/common/auth/refresh').reply(200, {
      success: true,
      data: { accessToken: 'n2', refreshToken: 'r2' },
    });

    let caught: unknown = null;
    // 先挂 rejection handler 再 await（避免 jest worker 级 unhandledRejection 直接杀进程）
    const p = client.refreshAccessToken().then(
      (v) => `resolved:${v}`,
      (e: Error) => {
        caught = e;
        return 'rejected';
      },
    );
    const outcome = await p;
    expect(outcome).toBe('rejected');
    expect((caught as Error | null)?.message).toBe('mirror boom');
    expect(onUnauthorized).not.toHaveBeenCalled(); // 副作用抛错不登出
    expect(store.get('t.key')).toBe('n2'); // set 已完成（在 onTokenRefreshed 之前）
  });
});

describe('N-P1-2：tokenStorage 写失败静默（set/setAccess/clear）', () => {
  it('setItem 抛错 → set/setAccess 均不抛', async () => {
    const { tokenStorage } = makeStorage({
      setItem: async () => {
        throw new Error('boom');
      },
    });
    await expect(tokenStorage.set('a', 'r')).resolves.toBeUndefined();
    await expect(tokenStorage.setAccess('a2')).resolves.toBeUndefined();
  });

  it('deleteItem 抛错 → clear 不抛', async () => {
    const { tokenStorage } = makeStorage({
      deleteItem: async () => {
        throw new Error('boom');
      },
    });
    await expect(tokenStorage.clear()).resolves.toBeUndefined();
  });
});
