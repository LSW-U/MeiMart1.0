/**
 * 后端业务错误码 → errors ns 映射（批1 R6 自 login-sms.tsx 迁出，三 auth 页统一 import）
 *
 * 后端全局异常信封是 response.data.error.{code,message}
 * （实证：all-exceptions.filter.ts:86-92 + register.tsx:95 先例），主读信封位；顶层 data.code
 * 作防御性兼容一并保留。命中 errors ns（E-* key 先例见 after-sales-apply.tsx）用四语文案，
 * 未命中回退 fallback（默认 errors.network）。getApiErrorMessage 只取 message 不取 code，故单写
 */
export function toApiErrorText(
  error: unknown,
  t: (key: string) => string,
  fallback?: string,
): string {
  if (error && typeof error === 'object') {
    const err = error as {
      response?: { data?: { code?: string; error?: { code?: string } }; status?: number };
    };
    // 主读信封 error.code，兜底读顶层 data.code（旧路径防御）
    const code = err.response?.data?.error?.code ?? err.response?.data?.code;
    if (typeof code === 'string' && code.startsWith('E-')) {
      const text = t(`errors.${code}`);
      // Why: i18n 缺 key 时 t() 原样返回 key 本身，用回退而非裸 key 展示
      if (text !== `errors.${code}`) return text;
    }
    // 增补#1: 429 无 code 的兜底（网关/代理可能剥 body）——统一映射「操作频繁」
    if (err.response?.status === 429) {
      const text = t('errors.E-RATELIMIT-001');
      if (text !== 'errors.E-RATELIMIT-001') return text;
    }
  }
  return fallback ?? t('errors.network');
}
