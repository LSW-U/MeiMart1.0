/**
 * 自动重试（upload 模块批B · U2，2026-09-09）
 *
 * 策略（方案 v2 §1 U2 拍板）：网络类错误自动重试 2 次、指数退避；业务类（4xx 校验失败）不重试。
 * 弱网（帝力 4G）大图失败率高，指数退避给基站恢复窗口；4xx 重试无意义直接提示。
 */
import { uploadImageFile, type UploadRequest, type UploadResult } from './index';
import { UploadError, isRetryableKind } from './error';

/** 重试参数（默认 2 次 + 1s/2s 指数退避） */
export interface RetryOptions {
  /** 自动重试次数上限（默认 2，0 = 关闭自动重试） */
  retries?: number;
  /** 首次退避毫秒数（默认 1000，后续 ×2：1s → 2s） */
  baseDelayMs?: number;
  /** 测试注入：替换 sleep（单测免真实等待） */
  sleepFn?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 带自动重试的上传：仅网络类错误（fetch throw / 5xx）重试，业务类直接抛 UploadError。
 * uploadImageFile 本体已抛 UploadError（index.ts 批B 起），此处不再做错误归一。
 *
 * @throws UploadError（业务类首次抛出；网络类耗尽自动重试后抛出最后一轮的错误）
 */
export async function uploadImageFileWithRetry(
  req: UploadRequest,
  opts: RetryOptions = {},
): Promise<UploadResult> {
  const retries = opts.retries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 1000;
  const wait = opts.sleepFn ?? sleep;

  let lastError: UploadError | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await wait(baseDelayMs * Math.pow(2, attempt - 1));
    }
    try {
      return await uploadImageFile(req);
    } catch (err) {
      if (err instanceof UploadError) {
        lastError = err;
        if (!isRetryableKind(err.kind)) throw err;
      } else {
        // 防御：非 UploadError（如 appendUploadFile 的 blob 读取失败）按网络类处理可重试
        lastError = new UploadError('network', err instanceof Error ? err.message : String(err), { cause: err });
      }
      // 网络类：继续下一轮（耗尽后循环结束抛出）
    }
  }
  throw lastError ?? new UploadError('network', 'Upload failed after retries');
}
