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
