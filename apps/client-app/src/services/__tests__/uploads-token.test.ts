/**
 * C-P2-16: uploads 复用 api.ts tokenStorage 单一真值源
 *
 * uploads.ts 自维护 TOKEN_KEY 已删——getToken 经 tokenStorage.get()（api.ts 导出）；
 * 平台分支/key/异常兜底收敛到一处。断言 token 从 tokenStorage 流入上传请求。
 */
import { tokenStorage } from '@/services/api';
import { uploadsApi } from '@/services/uploads';

const fetchMock = jest.fn();

jest.mock('@/services/api', () => {
  // api.ts 真身太重（axios 拦截器/authStore），mock 出 tokenStorage 形态 + isMockMode
  const store = {
    get: jest.fn(),
    set: jest.fn(),
    getRefresh: jest.fn(),
    clear: jest.fn(),
  };
  return { isMockMode: false, tokenStorage: store, api: { get: jest.fn(), post: jest.fn() } };
});

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { API_BASE_URL: 'http://test.local/api/v1' } },
}));

jest.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ accessToken: null }) },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));

jest.mock('@meimart/upload-core', () => ({
  // 批5 C1：mock 同步补 makeApiBaseUrl（uploads.ts 模块加载时调用做 baseUrl 校验）
  makeApiBaseUrl: (raw: string) => raw,
  uploadImageFileWithRetry: (opts: Record<string, unknown>) => globalFetchCapture(opts),
}));

// upload-core 内部自己 fetch——mock 版把入参透传，断言 token 参数
let lastUploadCall: Record<string, unknown> | null = null;
const globalFetchCapture = (opts: Record<string, unknown>) => {
  lastUploadCall = opts;
  return Promise.resolve({ url: 'http://minio/x.jpg', key: 'x.jpg', size: 1 });
};

beforeEach(() => {
  fetchMock.mockReset();
  lastUploadCall = null;
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  (tokenStorage.get as jest.Mock).mockReset();
  (tokenStorage.get as jest.Mock).mockResolvedValue(null);
});

describe('C-P2-16 uploads token 单一真值源', () => {
  it('authStore 无 token 时 → 走 tokenStorage.get() 取 token', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValueOnce('stored-token');
    await uploadsApi.refundEvidence('file:///tmp/x.jpg', 'image/jpeg');
    expect(tokenStorage.get).toHaveBeenCalledTimes(1);
    expect(lastUploadCall?.token).toBe('stored-token');
  });

  it('authStore 有 token → 优先内存 token，不读 storage', async () => {
    const { useAuthStore } = jest.requireMock('@/store/authStore') as {
      useAuthStore: { getState: () => { accessToken: string | null } };
    };
    useAuthStore.getState = () => ({ accessToken: 'memory-token' });
    await uploadsApi.reviewImage('file:///tmp/y.jpg', 'image/png');
    expect(tokenStorage.get).not.toHaveBeenCalled();
    expect(lastUploadCall?.token).toBe('memory-token');
    useAuthStore.getState = () => ({ accessToken: null });
  });

  it('tokenStorage 无 token → token 为 null（上传不因缺 token 崩，后端 401 兜底）', async () => {
    await uploadsApi.feedbackImage('file:///tmp/z.jpg', 'image/jpeg');
    expect(tokenStorage.get).toHaveBeenCalledTimes(1);
    expect(lastUploadCall?.token).toBeNull();
  });

  it('api.ts tokenStorage 确实导出（单一真值源可被 import，回归防误删）', () => {
    expect(typeof tokenStorage.get).toBe('function');
    expect(typeof tokenStorage.set).toBe('function');
  });

  it('uploads.ts 不再自维护 TOKEN_KEY（源码级回归断言）', () => {
    // 原因：读源码文本做防回归断言，fs/require.resolve 仅测试内使用（tsconfig types 无 node，
    // 断言入参显式 unknown 收窄，不引 @types/node 进主工程）
    type FsLike = { readFileSync: (p: string, enc: string) => string };
    type RequireLike = { resolve: (id: string) => string };
    const req = require as unknown as RequireLike;
    const fs = require('fs') as unknown as FsLike;
    const src = fs.readFileSync(req.resolve('@/services/uploads'), 'utf8');
    expect(src).not.toMatch(/TOKEN_KEY\s*=/);
    expect(src).toContain('tokenStorage.get()');
  });
});
