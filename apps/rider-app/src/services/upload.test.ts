/**
 * Upload service 单测 —— upload 模块批A（2026-09-09）
 *
 * 覆盖：
 *   1. riderUploadApi 端点映射（3 端点 path 单一来源锚定）：avatar/idCardImage/licenseImage
 *      各打 /api/v1/common/rider/uploads/<path>，multipart field=file，带 Authorization + Accept-Language
 *   2. mock 模式短路：isMockMode=true 不发 fetch，返回伪 MinIO URL
 *   3. 错误提取：非 2xx 响应读 body.error.message（E-UPLOAD 错误码包装）→ Error message
 *   4. 成功解析：{ success, data: { url, key, size } } → UploadResult
 *
 * 桩法：fetch 全局 mock（upload-core 用 fetch + FormData，无 axios）；
 *       tokenStorage mock（避免拉 SecureStore）；'./api' mock 控制 API_BASE_URL + isMockMode
 *       （Why 不用 process.env：ES import 提升在 env 赋值之前 + babel-preset-expo 会把
 *       EXPO_PUBLIC_* 编译期内联，运行时赋值不可达——mock 模块是唯一确定性入口）。
 * 为什么走 RN project（node 环境）：upload-core 不依赖 DOM，FormData node 18+ 原生可用。
 */

import { riderUploadApi } from './upload';

const mockFetch = jest.fn();

jest.mock('./api', () => ({
  API_BASE_URL: 'https://api.test.example.com/api/v1',
  isMockMode: false,
}));

jest.mock('./token-storage', () => ({
  tokenStorage: { get: jest.fn(async () => 'test-token') },
}));

/** 构造上传成功响应 */
function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: {
        url: 'https://minio.test/avatars/avatar-1.jpg',
        key: 'avatars/avatar-1.jpg',
        size: 1234,
      },
    }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  // globalThis 而非 global：RN tsconfig lib 未含 node 类型，`global` 名不存在
  (globalThis as { fetch: unknown }).fetch = mockFetch;
});

describe('riderUploadApi 端点映射（upload 模块批A 单一来源锚定）', () => {
  it('avatar → POST {base}/common/rider/uploads/avatar，field=file，带 Bearer + Accept-Language', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    await riderUploadApi.avatar('file:///tmp/a.jpg', 'image/jpeg');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test.example.com/api/v1/common/rider/uploads/avatar');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(init.headers['Accept-Language']).toBe('en');
    // multipart body 由 fetch FormData 承载（不能手动设 Content-Type）
    expect(init.body).toBeInstanceOf(FormData);
    // FormData str 化不吐 part 名（undici 实现），用 get() 验 file field
    expect(init.body.get('file')).toBeTruthy();
  });

  it('idCardImage → POST .../common/rider/uploads/id-card-image', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    await riderUploadApi.idCardImage('file:///tmp/bi.jpg', 'image/png');

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.test.example.com/api/v1/common/rider/uploads/id-card-image',
    );
  });

  it('licenseImage → POST .../common/rider/uploads/license-image', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    await riderUploadApi.licenseImage('file:///tmp/lic.jpg', 'image/webp');

    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.test.example.com/api/v1/common/rider/uploads/license-image',
    );
  });

  it('成功响应解析出 UploadResult{url,key,size}', async () => {
    mockFetch.mockResolvedValueOnce(okResponse());

    const result = await riderUploadApi.avatar('file:///tmp/a.jpg', 'image/jpeg');

    expect(result).toEqual({
      url: 'https://minio.test/avatars/avatar-1.jpg',
      key: 'avatars/avatar-1.jpg',
      size: 1234,
    });
  });

  it('422 E-UPLOAD-017（avatar 非 1:1）→ Error message 取 body.error.message（错误码包装优先）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'E-UPLOAD-017', message: 'Rider avatar must be square' },
      }),
    });

    await expect(riderUploadApi.avatar('file:///tmp/a.jpg', 'image/jpeg')).rejects.toThrow(
      'Rider avatar must be square',
    );
  });

  it('错误体无 error 包装 → 兜底顶层 message，再兜底 HTTP status 文案（批B U2：500/503 网络类自动重试，mockImplementation 每轮同错）', async () => {
    mockFetch.mockImplementation(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'internal boom' }),
    }));
    await expect(riderUploadApi.licenseImage('file:///tmp/l.jpg', 'image/jpeg')).rejects.toThrow(
      'internal boom',
    );
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 + 2 次自动重试（指数退避）
    mockFetch.mockClear();
    mockFetch.mockImplementation(async () => ({
      ok: false,
      status: 503,
      json: async () => null,
    }));
    await expect(riderUploadApi.idCardImage('file:///tmp/b.jpg', 'image/jpeg')).rejects.toThrow(
      'Upload failed (503)',
    );
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 15000); // 两轮网络类失败各走真实退避 ~3s，加超时余量
});
