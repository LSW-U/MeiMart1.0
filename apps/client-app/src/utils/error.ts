/**
 * axios error 判断工具（T2: cart 等页面区分 401 登录态失效 vs 其他错误）
 *
 * 复用 api.ts interceptor 的 error.response?.status === 401 判断模式（抽 util，避免每页重写）
 */

/**
 * 判断 unknown error 是否 axios 401（登录态失效）
 * @param error React Query 的 error（unknown 类型，需窄化）
 */
export function isAxios401(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { response?: { status?: number } };
  return e.response?.status === 401;
}

/**
 * 提取后端 API 错误 message（axios error.response.data.message）
 *
 * 后端返 JSON { statusCode, code, message }，但 axios 默认 err.message 是
 * "Request failed with status XXX"（技术性，不友好）。此 helper 提取后端业务 message
 * （如 "Refund already in progress (status: PENDING)"），提取不到回退 err.message / fallback。
 *
 * @param error React Query / mutateAsync 抛的 unknown error
 * @param fallback 提取不到时的兜底文案（建议传 i18n 通用错误文案）
 */
export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  // 后端 message 可能是 string 或 string[]（NestJS class-validator 批量校验），取首个
  const backendMsg = e.response?.data?.message;
  if (typeof backendMsg === 'string') return backendMsg;
  if (Array.isArray(backendMsg) && backendMsg.length > 0) return backendMsg[0];
  return e.message ?? fallback;
}
