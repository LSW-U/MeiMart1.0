/**
 * 上传核心本体（批B 自 index.ts 拆出，避免 index → retry → index 循环引用）
 *
 * client-app + rider-app 共用「fetch + FormData 跨平台上传」核心逻辑；
 * 两 app 的 service 层各自组装端点/token/locale 差异，本包只管平台无关部分。
 */
import { UploadError } from './error';

/** 上传成功响应 data（所有上传端点同构） */
export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

/** 上传错误响应体（Nest 错误包装 { error: { code, message } }） */
interface UploadErrorBody {
  error?: { code?: string; message?: string };
  message?: string;
}

/**
 * 从上传失败响应提取可读 message（三端一致错误处理——A1 验收线）。
 * 优先 error.message（错误码包装），兜底顶层 message，最后 HTTP status。
 */
export function extractUploadErrorMessage(status: number, body: UploadErrorBody | null): string {
  return body?.error?.message ?? body?.message ?? `Upload failed (${status})`;
}

/** 上传请求参数 */
export interface UploadRequest {
  /** API baseURL（已含 /api/v1 前缀，与 app service 层既有 fetch 拼法一致） */
  baseUrl: string;
  /** 端点相对路径（不含 /api/v1，如 'client/uploads/avatar'） */
  path: string;
  /** 本地文件 URI（expo-image-picker assets[].uri） */
  fileUri: string;
  /** MIME 类型（如 image/jpeg） */
  mimeType: string;
  /** 上传文件名（key 后缀按 magic bytes 服务端重定，文件名仅 multipart 表单用） */
  filename: string;
  /** Bearer token（可空；mock 模式或公共端点不传） */
  token?: string | null;
  /** Accept-Language 值 */
  locale?: string;
}

/**
 * 跨平台 FormData append：
 *   - web：expo-image-picker assets[].uri 是 blob:/data: URL，标准 FormData 只认 Blob/File
 *   - native：RN FormData 支持 {uri,type,name} 描述符
 */
export async function appendUploadFile(
  formData: FormData,
  fileUri: string,
  mimeType: string,
  filename: string,
  fieldName = 'file',
): Promise<void> {
  const isWeb = typeof document !== 'undefined';
  if (isWeb) {
    const blob = await (await fetch(fileUri)).blob();
    formData.append(fieldName, blob, filename);
  } else {
    // RN 运行时支持 {uri,type,name}；TS DOM lib 类型限 string|Blob，此处经 RN 声明扩展使用
    (formData.append as unknown as (
      n: string,
      v: { uri: string; type?: string; name?: string },
    ) => void)(fieldName, { uri: fileUri, type: mimeType, name: filename });
  }
}

/**
 * 上传核心：fetch + FormData（multipart boundary 由 fetch 自动设，不能手动设 Content-Type）。
 * 调用方（client/rider service 层）只提供 baseUrl/path/文件/token/locale。
 *
 * 批B（U2 错误分类）：非 2xx 抛 UploadError——
 *   4xx（E-UPLOAD 校验失败）→ kind='business'（不自动重试，直接提示）；
 *   5xx → kind='network'（可自动重试）；fetch throw（断网/DNS）→ kind='network'。
 * message 提取逻辑不变（extractUploadErrorMessage 三端一致）。
 *
 * @throws UploadError（kind 区分 network/business，code 携带 E-UPLOAD 错误码）
 */
export async function uploadImageFile(req: UploadRequest): Promise<UploadResult> {
  const formData = new FormData();
  await appendUploadFile(formData, req.fileUri, req.mimeType, req.filename);
  const headers: Record<string, string> = {
    'Accept-Language': req.locale ?? 'en',
  };
  if (req.token) headers.Authorization = `Bearer ${req.token}`;
  let res: Response;
  try {
    res = await fetch(`${req.baseUrl}/${req.path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (err) {
    // 断网 / DNS / 请求中途断开：无 HTTP 响应，网络类
    throw new UploadError('network', err instanceof Error ? err.message : String(err), { cause: err });
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as UploadErrorBody | null;
    const kind = res.status >= 500 ? 'network' : 'business';
    throw new UploadError(kind, extractUploadErrorMessage(res.status, body), {
      code: body?.error?.code,
      status: res.status,
    });
  }
  const json = (await res.json()) as { success: boolean; data: UploadResult };
  return json.data;
}
