/**
 * 上传错误分类（upload 模块批B · U2 重试策略，2026-09-09）
 *
 * 两类错误（方案 v2 §1 U2 拍板）：
 *   - network：断网 / DNS 失败 / 请求中途断开（fetch throw）/ HTTP 5xx——自动重试有意义
 *   - business：HTTP 4xx（E-UPLOAD 校验失败：类型 / 尺寸 / 比例 / 超限）——重试无意义，直接提示
 *
 * 分类依据后端错误响应形态（Nest { error: { code, message } } + i18nKey）：
 *   4xx 一律 business（后端只对校验失败回 4xx）；5xx / fetch throw 一律 network。
 */

/** 上传错误类别 */
export type UploadErrorKind = 'network' | 'business';

/** 结构化上传错误：携带类别（重试判定用）+ 后端错误码（本地化文案映射用） */
export class UploadError extends Error {
  readonly kind: UploadErrorKind;
  /** 后端错误码（如 'E-UPLOAD-020'），网络类无码 */
  readonly code?: string;
  readonly status?: number;

  constructor(kind: UploadErrorKind, message: string, options?: { code?: string; status?: number; cause?: unknown }) {
    super(message);
    this.name = 'UploadError';
    this.kind = kind;
    if (options?.code !== undefined) this.code = options.code;
    if (options?.status !== undefined) this.status = options.status;
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

/** HTTP 5xx / 网络层错误 → network（可重试）；4xx → business（不重试） */
export function isRetryableKind(kind: UploadErrorKind): boolean {
  return kind === 'network';
}
