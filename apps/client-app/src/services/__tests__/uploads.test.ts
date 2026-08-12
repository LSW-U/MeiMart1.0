// 上传 service 测试：验证 fetch URL 不重复 /api/v1（P15 修复 404）+ 失败抛后端 message
import { uploadsApi } from '../uploads';

// jest.mock 被 jest（babel-plugin-jest）hoist 到 import 前执行，故虽写在 import 后，
// 仍在 uploads.ts module load 前生效，控制 isMockMode=false + API_BASE_URL 含 /api/v1
jest.mock('../api', () => ({ isMockMode: false }));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { API_BASE_URL: 'http://test.local/api/v1' } },
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue(null) }));
jest.mock('@/store/authStore', () => ({
  useAuthStore: { getState: () => ({ accessToken: null }) },
}));
jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'en' }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

const okResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve({ success: true, data }),
});

describe('uploadsApi URL 拼接（不重复 /api/v1）', () => {
  it('refundEvidence URL = baseURL/client/uploads/refund-evidence（无 /api/v1/api/v1）', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({ url: 'http://minio/x.jpg', key: 'refunds/x', size: 1024 }),
    );
    const result = await uploadsApi.refundEvidence('file:///tmp/x.jpg', 'image/jpeg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('http://test.local/api/v1/client/uploads/refund-evidence');
    // 核心断言：不允许 /api/v1 重复（用户报的 404 根因）
    expect(url).not.toMatch(/\/api\/v1\/api\/v1/);
    expect(result.url).toBe('http://minio/x.jpg');
  });

  it('reviewImage URL = baseURL/client/uploads/review-image（无 /api/v1/api/v1）', async () => {
    fetchMock.mockResolvedValueOnce(
      okResponse({ url: 'http://minio/i.jpg', key: 'reviews/i', size: 512 }),
    );
    const result = await uploadsApi.reviewImage('file:///tmp/i.jpg', 'image/jpeg');
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe('http://test.local/api/v1/client/uploads/review-image');
    expect(url).not.toMatch(/\/api\/v1\/api\/v1/);
    expect(result.url).toBe('http://minio/i.jpg');
  });

  it('baseURL 含 /api/v1 时路径只带 /client/uploads/...（与 api.ts axios 一致）', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ url: 'u', key: 'k', size: 1 }));
    await uploadsApi.refundEvidence('file:///x.jpg', 'image/jpeg');
    const url = fetchMock.mock.calls[0][0] as string;
    // /api/v1 只出现一次（在 baseURL 部分），client/uploads 在后
    expect((url.match(/\/api\/v1/g) || []).length).toBe(1);
    expect(url).toContain('/client/uploads/refund-evidence');
  });
});

describe('uploadsApi 错误处理', () => {
  it('!res.ok 时抛后端 error.message（400 magic bytes 失败等）', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: '文件内容不是有效的图片' } }),
    });
    await expect(uploadsApi.refundEvidence('file:///x.jpg', 'image/jpeg')).rejects.toThrow(
      '文件内容不是有效的图片',
    );
  });

  it('!res.ok 时后端顶层 message 也兼容（NestJS 标准格式）', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 413,
      json: () => Promise.resolve({ message: '文件过大' }),
    });
    await expect(uploadsApi.reviewImage('file:///x.jpg', 'image/jpeg')).rejects.toThrow('文件过大');
  });

  it('!res.ok 时 json 解析失败回退 status 文案', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('parse error')),
    });
    await expect(uploadsApi.refundEvidence('file:///x.jpg', 'image/jpeg')).rejects.toThrow(
      'Upload failed (500)',
    );
  });
});
