/** 批4 验收①③：createApiClient 单测 —— 单飞 refresh / isAuthEndpoint 排除 / 剥层 / throwApiError */
import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { createApiClient, createTokenStorage, ApiError } from '../src/http';

function makeDeps() {
  const store = new Map<string, string>();
  const adapter = {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    deleteItem: async (k: string) => void store.delete(k),
  };
  const tokenStorage = createTokenStorage({
    tokenKey: 't.key',
    refreshKey: 'r.key',
    adapter,
  });
  return { store, tokenStorage };
}

describe('createApiClient 单飞 refresh（D14/M1，验收①）', () => {
  let mock: AxiosMockAdapter;

  afterEach(() => mock.restore());

  it('并发 401 仅 1 次 refresh 请求，全部重试成功', async () => {
    const { tokenStorage, store } = makeDeps();
    const { api, refreshAccessToken } = createApiClient({
      baseURL: 'http://test',
      tokenStorage,
      debugLog: false,
    });
    mock = new AxiosMockAdapter(api);

    await tokenStorage.set('old-access', 'refresh-1');

    let refreshCalls = 0;
    mock.onPost('/common/auth/refresh').reply(() => {
      refreshCalls += 1;
      return [200, { success: true, data: { accessToken: 'new-access', refreshToken: 'refresh-2' } }];
    });
    // 业务端点：第一次 401（旧 token），重放 200
    mock.onGet('/things').replyOnce(401, { success: false }).onGet('/things').reply(200, { success: true, data: ['ok'] });

    // 3 个并发请求全部 401
    const [a, b, c] = await Promise.all([
      api.get('/things'),
      api.get('/things'),
      api.get('/things'),
    ]);
    expect(a.data).toEqual(['ok']);
    expect(b.data).toEqual(['ok']);
    expect(c.data).toEqual(['ok']);
    expect(refreshCalls).toBe(1); // 单飞：只刷 1 次
    expect(store.get('r.key')).toBe('refresh-2'); // 新 refresh token 写回
    void refreshAccessToken;
  });

  it('refresh 失败 → 401 透传原始 error（throwApiError=false 默认）', async () => {
    const { tokenStorage } = makeDeps();
    const { api } = createApiClient({ baseURL: 'http://test', tokenStorage });
    mock = new AxiosMockAdapter(api);
    await tokenStorage.set('old', 'bad-refresh');
    mock.onPost('/common/auth/refresh').reply(401, {});
    mock.onGet('/x').reply(401, {});
    await expect(api.get('/x')).rejects.toMatchObject({ response: { status: 401 } });
  });
});

describe('isAuthEndpoint 排除（T4，验收③）', () => {
  let mock: AxiosMockAdapter;

  afterEach(() => mock.restore());

  it('/common/auth/* 的 401 不触发 refresh（登录凭据错场景）', async () => {
    const { tokenStorage } = makeDeps();
    const onUnauthorized = jest.fn();
    const { api } = createApiClient({
      baseURL: 'http://test',
      tokenStorage,
      onUnauthorized,
    });
    mock = new AxiosMockAdapter(api);
    await tokenStorage.set('a', 'r');
    mock.onPost('/common/auth/login').reply(401, {});
    await expect(api.post('/common/auth/login', {})).rejects.toBeTruthy();
    expect(mock.history.post.filter((r) => r.url === '/common/auth/refresh')).toHaveLength(0);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('业务端点 401 仍走 refresh 重试', async () => {
    const { tokenStorage } = makeDeps();
    const { api } = createApiClient({ baseURL: 'http://test', tokenStorage });
    mock = new AxiosMockAdapter(api);
    await tokenStorage.set('a', 'r');
    mock.onPost('/common/auth/refresh').reply(200, { success: true, data: { accessToken: 'n', refreshToken: 'r2' } });
    mock.onGet('/orders').replyOnce(401).onGet('/orders').reply(200, { success: true, data: 1 });
    const res = await api.get('/orders');
    expect(res.data).toBe(1);
  });
});

describe('响应剥层与 throwApiError（rider 语义）', () => {
  let mock: AxiosMockAdapter;
  afterEach(() => mock.restore());

  it('{ success, data } 壳剥层；auth 端点（无 success 字段）跳过', async () => {
    const { tokenStorage } = makeDeps();
    const { api } = createApiClient({ baseURL: 'http://test', tokenStorage });
    mock = new AxiosMockAdapter(api);
    mock.onGet('/biz').reply(200, { success: true, data: { a: 1 } });
    mock.onPost('/common/auth/sms-code').reply(200, { sent: true });
    expect((await api.get('/biz')).data).toEqual({ a: 1 });
    expect((await api.post('/common/auth/sms-code')).data).toEqual({ sent: true });
  });

  it('throwApiError=true：非 401 抛 ApiError(status, code)（rider 行为，验收① ApiError 分型）', async () => {
    const { tokenStorage } = makeDeps();
    const { api } = createApiClient({ baseURL: 'http://test', tokenStorage, throwApiError: true });
    mock = new AxiosMockAdapter(api);
    mock.onGet('/e').reply(422, { success: false, error: { code: 'E-X', message: 'bad' } });
    try {
      await api.get('/e');
      throw new Error('should not reach');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.status).toBe(422);
      expect(e.code).toBe('E-X');
      expect(e.message).toBe('bad');
      expect(e.name).toBe('ApiError');
    }
  });

  it('Accept-Language 头按 getLocale 注入；无 getLocale 不加', async () => {
    const { tokenStorage } = makeDeps();
    const withLocale = createApiClient({ baseURL: 'http://test', tokenStorage, getLocale: () => 'zh' });
    const m1 = new AxiosMockAdapter(withLocale.api);
    m1.onGet('/h').reply(200, {});
    await withLocale.api.get('/h');
    expect(m1.history.get[0].headers?.['Accept-Language']).toBe('zh');
    m1.restore();

    const noLocale = createApiClient({ baseURL: 'http://test', tokenStorage });
    const m2 = new AxiosMockAdapter(noLocale.api);
    m2.onGet('/h').reply(200, {});
    await noLocale.api.get('/h');
    expect(m2.history.get[0].headers?.['Accept-Language']).toBeUndefined();
    m2.restore();
  });

  it('getAccessToken 内存 token 优先于存储', async () => {
    const { tokenStorage } = makeDeps();
    const { api } = createApiClient({
      baseURL: 'http://test',
      tokenStorage,
      getAccessToken: () => 'memory-token',
    });
    mock = new AxiosMockAdapter(api);
    await tokenStorage.set('stored-token', 'r');
    mock.onGet('/h').reply(200, {});
    await api.get('/h');
    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer memory-token');
  });
});
