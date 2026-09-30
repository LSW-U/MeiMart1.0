/**
 * 统一日志脱敏（D11 批4，R-P1-10）。
 *
 * Why：原 4 处 console.error / sentry dev 直印完整 error 对象——AxiosError 带
 *   config.headers.Authorization（Bearer token）、config.data（密码/验证码）、
 *   response.config 同构复制，整对象落日志 = 凭证与 PII 入 logcat/控制台。
 *
 * 规则：错误对象只取安全面（name + message + ApiError 的 status/code），
 *   message 由后端/HTTP 层产生，不含请求凭证；其余字段（config/request/response）
 *   一律不落。非 Error 值（string 等）按字符串处理。
 */
export function redactError(e: unknown): string {
  if (e instanceof Error) {
    const status = (e as { status?: unknown }).status;
    const code = (e as { code?: unknown }).code;
    const parts = [e.name, e.message];
    if (typeof code === 'string') parts.push(`code=${code}`);
    if (typeof status === 'number' || typeof status === 'string') parts.push(`status=${status}`);
    return parts.filter(Boolean).join(' ');
  }
  return String(e);
}
