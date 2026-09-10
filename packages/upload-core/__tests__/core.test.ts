/**
 * upload-core 批B 单测（2026-09-09）
 *
 * 覆盖任务书改动6 的四类：错误分类 / 重试退避 / 状态机（预校验规则在
 * client-app/rider-app 各自的 precheck 测试中覆盖，此处聚焦共享核心）。
 *
 * 桩法：全局 fetch mock（与 rider upload.test.ts 同范式——upload-core 用 fetch + FormData）。
 */
import { uploadImageFile, uploadImageFileWithRetry, UploadError } from '../src/index';
import {
  createSlot,
  slotToUploading,
  slotToDone,
  slotToError,
} from '../src/upload-state';
import type { UploadRequest } from '../src/core';

const mockFetch = jest.fn();

const req = (over: Partial<UploadRequest> = {}): UploadRequest => ({
  baseUrl: 'https://api.test.example.com/api/v1',
  path: 'client/uploads/avatar',
  fileUri: 'file:///tmp/a.jpg',
  mimeType: 'image/jpeg',
  filename: 'avatar.jpg',
  token: 't',
  locale: 'en',
  ...over,
});

const okResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({
    success: true,
    data: { url: 'https://minio.test/a.jpg', key: 'a.jpg', size: 1 },
  }),
});

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
});

describe('错误分类（U2）', () => {
  it('4xx 校验失败 → UploadError kind=business 且带 E-UPLOAD 码', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'E-UPLOAD-020', message: 'Avatar must be 1:1 square' },
      }),
    });
    await expect(uploadImageFile(req())).rejects.toMatchObject({
      name: 'UploadError',
      kind: 'business',
      code: 'E-UPLOAD-020',
      status: 400,
    });
  });

  it('5xx → kind=network（可重试类）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => null,
    });
    await expect(uploadImageFile(req())).rejects.toMatchObject({
      kind: 'network',
      status: 503,
    });
  });

  it('fetch throw（断网/DNS）→ kind=network', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(uploadImageFile(req())).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('自动重试（U2：网络类 2 次指数退避，业务类不重试）', () => {
  it('网络类失败 → 自动重试至成功，sleep 序列呈指数退避 [1000, 2000]', async () => {
    const waits: number[] = [];
    const sleepFn = (ms: number) => {
      waits.push(ms);
      return Promise.resolve();
    };
    mockFetch
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => null })
      .mockResolvedValueOnce(okResponse());

    const result = await uploadImageFileWithRetry(req(), { sleepFn });

    expect(result.url).toBe('https://minio.test/a.jpg');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([1000, 2000]);
  });

  it('业务类（4xx）→ 首次即抛不重试（fetch 只调 1 次）', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'E-UPLOAD-021', message: 'width out of range' },
      }),
    });
    await expect(uploadImageFileWithRetry(req(), { sleepFn: () => Promise.resolve() })).rejects.toBeInstanceOf(
      UploadError,
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('网络类耗尽 2 次重试 → 抛 UploadError kind=network（共调 3 次）', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    await expect(
      uploadImageFileWithRetry(req(), { sleepFn: () => Promise.resolve() }),
    ).rejects.toMatchObject({ kind: 'network' });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});

describe('图片位状态机（U3 内联进度 + 手动重试兜底）', () => {
  it('idle → uploading(60) → done(100, remoteUrl) 全程推进', () => {
    let slot = createSlot('s1', 'file:///tmp/pick.jpg');
    expect(slot.state).toBe('uploading'); // 选图后即进入上传态（带本地预览）
    slot = slotToUploading(slot);
    expect(slot.progress).toBe(60);
    slot = slotToDone(slot, 'https://minio.test/a.jpg');
    expect(slot.state).toBe('done');
    expect(slot.progress).toBe(100);
    expect(slot.remoteUrl).toBe('https://minio.test/a.jpg');
  });

  it('失败态保留本地预览 + 提取错误码/类别（UploadError 传入）', () => {
    const slot = createSlot('s2', 'file:///tmp/pick.jpg');
    const err = new UploadError('business', 'ratio out of range', { code: 'E-UPLOAD-022' });
    const failed = slotToError(slot, err);
    expect(failed.state).toBe('error');
    expect(failed.localUri).toBe('file:///tmp/pick.jpg'); // 预览保留
    expect(failed.errorCode).toBe('E-UPLOAD-022');
    expect(failed.errorKind).toBe('business');
  });

  it('裸 Error 传入失败态 → errorKind 兜底 network（提示可重试）', () => {
    const slot = createSlot('s3', 'file:///tmp/pick.jpg');
    const failed = slotToError(slot, new Error('boom'));
    expect(failed.errorKind).toBe('network');
    expect(failed.errorCode).toBeUndefined();
  });
});
