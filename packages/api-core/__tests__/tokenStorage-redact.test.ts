/** 批4 验收①⑤：tokenStorage key 参数化 + redact 递归脱敏 + 敏感键集并集 */
import { createTokenStorage, redact, SENSITIVE_KEYS, ApiError } from '../src/http';

function memStore() {
  const store = new Map<string, string>();
  return {
    store,
    adapter: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
      deleteItem: async (k: string) => void store.delete(k),
    },
  };
}

describe('tokenStorage key 参数化（验收⑤）', () => {
  it('两个不同 key 的实例互不串数据（client meimart.token vs rider mei-delivery.token）', async () => {
    const { adapter } = memStore();
    const client = createTokenStorage({ tokenKey: 'meimart.token', refreshKey: 'meimart.refresh', adapter });
    const rider = createTokenStorage({ tokenKey: 'mei-delivery.token', refreshKey: 'mei-delivery.refresh', adapter });

    await client.set('c-token', 'c-refresh');
    expect(await rider.get()).toBeNull();
    expect(await rider.getRefresh()).toBeNull();

    await rider.set('r-token', 'r-refresh');
    expect(await client.get()).toBe('c-token');
    expect(await rider.get()).toBe('r-token');

    await client.clear();
    expect(await client.get()).toBeNull();
    expect(await client.getRefresh()).toBeNull();
    expect(await rider.get()).toBe('r-token'); // rider 不被 client clear 波及
  });

  it('setAccess 只写 access、不动 refresh（rider D6 语义）', async () => {
    const { adapter } = memStore();
    const ts = createTokenStorage({ tokenKey: 't', refreshKey: 'r', adapter });
    await ts.set('a1', 'rf1');
    await ts.setAccess('a2');
    expect(await ts.get()).toBe('a2');
    expect(await ts.getRefresh()).toBe('rf1');
  });

  it('读失败返 null（异常兜底对齐两端现行为）', async () => {
    const ts = createTokenStorage({
      tokenKey: 't',
      refreshKey: 'r',
      adapter: {
        getItem: async () => {
          throw new Error('boom');
        },
        setItem: async () => {},
        deleteItem: async () => {},
      },
    });
    expect(await ts.get()).toBeNull();
    expect(await ts.getRefresh()).toBeNull();
  });
});

describe('redact 递归脱敏（验收①）', () => {
  it('嵌套对象/数组内敏感键全脱敏，非敏感键保留', () => {
    const input = {
      username: 'jo',
      password: 'p1',
      nested: { token: 'tk', note: 'keep', deep: [{ refreshToken: 'rt', v: 2 }] },
    };
    const out = redact(input) as Record<string, unknown>;
    expect(out.username).toBe('jo');
    expect(out.password).toBe('***');
    const nested = out.nested as Record<string, unknown>;
    expect(nested.token).toBe('***');
    expect(nested.note).toBe('keep');
    expect((nested.deep as Array<Record<string, unknown>>)[0].refreshToken).toBe('***');
    expect((nested.deep as Array<Record<string, unknown>>)[0].v).toBe(2);
  });

  it('敏感键集 = 两端并集（rider 多 code；含原 client 5 键）', () => {
    expect(SENSITIVE_KEYS).toEqual(
      expect.arrayContaining(['password', 'smsCode', 'token', 'refreshToken', 'secret', 'code']),
    );
    const out = redact({ code: '123456', smsCode: 'x', secret: 's' });
    expect(out).toEqual({ code: '***', smsCode: '***', secret: '***' });
  });

  it('原始值/数组原样返回；null 无炸', () => {
    expect(redact('plain')).toBe('plain');
    expect(redact(null)).toBeNull();
    expect(redact([1, { token: 't' }])).toEqual([1, { token: '***' }]);
  });
});

describe('ApiError 分型（验收①）', () => {
  it('status/code/message/name 与 rider 原实现一致', () => {
    const e = new ApiError(500, 'E-SERVER', 'boom');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(500);
    expect(e.code).toBe('E-SERVER');
    expect(e.message).toBe('boom');
    expect(e.name).toBe('ApiError');
  });
});
