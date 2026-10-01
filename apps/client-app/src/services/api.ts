import { createApiClient, type ApiClient } from '@meimart/api-core';
import { useAuthStore } from '@/store/authStore';
import { getCurrentLocale } from '@/i18n';
import { getExtra } from '@/config/app-config';
import { tokenStorage } from './token-storage';

// 批4（任务书 2）：api.ts 改为对 @meimart/api-core 的差异注入 + re-export。
// 调用方 import 路径与符号零变更（api/isMockMode/tokenStorage/useAuthStore 链）；
// 双轨 refresh（isRefreshing+pendingQueue 队列包裹层）删除，单飞实现在包内（D14/M1）；
// T4 isAuthEndpoint 排除纳入包行为（authEndpointPrefixes 参数化）；
// sanitizeLogPayload 换包级 redact()（递归脱敏 + 两端键集并集，rider 多 'code'）。

const env = getExtra();

const baseURL = env?.API_BASE_URL ?? 'https://api.meimart.example.com';
if (env?.APP_ENV === 'production' && !baseURL.startsWith('https://')) {
  console.error('[security] Production API must use HTTPS. Current:', baseURL);
}

// Why: 文档「问题 4」——APP_ENV=development 时永久走 mock，关不掉。
// 加 USE_MOCK=false 显式开关后，联调可切真实，演示切回 mock（删 USE_MOCK 行即恢复默认 mock）。
// 批4：mock 判据与环境读取保持端侧（任务书 4，批3 已定），不迁入包。
export const isMockMode = env?.USE_MOCK !== 'false' && env?.APP_ENV === 'development';

// 批4 验收⑤：'meimart.*' key 定义点收敛至 token-storage.ts（1 处），此处复用同一实例
export { tokenStorage };

const client: ApiClient = createApiClient({
  baseURL,
  tokenStorage,
  // client 内存镜像：authStore.accessToken 优先，存储兜底（原拦截器行为）
  getAccessToken: () => {
    const authState = useAuthStore.getState();
    return authState.accessToken ?? null;
  },
  // Why: 后端按 Accept-Language 返本地化数据（热搜词 lang / 错误文案），前端按当前 locale 传
  getLocale: () => getCurrentLocale(),
  // T4（api.ts:161 原行为）：排除 /common/auth/* 端点（登录/注册/refresh/logout 等获取
  // token 的端点）——对它们的 401 做 refresh 毫无意义（凭据错 vs token 失效），且多余
  // 请求 + clearAuth 副作用 + 状态抖动。批4 纳入包行为（验收③单测锚定）。
  authEndpointPrefixes: ['/common/auth/'],
  onUnauthorized: () => useAuthStore.getState().clearAuth(),
  // 原实现语义：refresh 成功 → setAuth(newToken, newRefresh)（authStore 内部再持久化）。
  // 包回调只给 access token，refresh token 从包级 tokenStorage 读回（refresh 已写回）。
  onTokenRefreshed: async (token) => {
    const newRefresh = await tokenStorage.getRefresh();
    useAuthStore.getState().setAuth(token, newRefresh ?? '');
  },
  // client 现行为：非 401 错误透传 axios 原始 error（调用方 ApiError 渐进迁移，任务书 1）
  throwApiError: false,
  debugLog: __DEV__,
});

export const api = client.api;
