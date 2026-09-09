/**
 * Push 注册 hook（批B B1）——登录成功注册 / 登出注销
 *
 * 挂载：AppProviders 内单点（pushDelegate 常驻组件），useEffect 监听 isAuthenticated：
 *   true  → fetchExpoPushToken + registerPushToken（失败静默，不重试轰炸；
 *           重试锚点=下次登录/登出再登录，保守策略）
 *   false → 用注册时缓存的 token 调 deletePushToken（幂等）
 *
 * token 缓存策略：模块级变量（会话内存）而非 AsyncStorage——
 * 登出后要拿「本会话注册过的 token」去注销；冷启动未注册过则无 token 可删，
 * 后端残留由 receipts NotRegistered → INVALID 兜底（方案 §6 风险3）。
 */
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchExpoPushToken,
  registerPushToken,
  deletePushToken,
  shouldInitPush,
} from '@/services/push';

// Why: 模块级（非 useRef）——authStore 变化由 pushDelegate 单组件消费，
// 但登出时组件可能已重渲染/重挂载，跨实例保留注册痕迹用模块级最稳
let registeredTokenThisSession: string | null = null;

export function usePushRegistration(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Why: 记录上一次登录态，只在 false→true / true→false 边沿动作，
  // 避免每次渲染重复注册（AppProviders 重挂载等场景）
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    if (!shouldInitPush()) return;
    const wasAuth = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (isAuthenticated && !wasAuth) {
      // 登录边沿：注册（fetch 内部已含权限申请；任一步失败静默）
      void (async () => {
        const token = await fetchExpoPushToken();
        if (!token) return;
        const ok = await registerPushToken(token);
        if (ok) registeredTokenThisSession = token;
      })();
    } else if (!isAuthenticated && wasAuth) {
      // 登出边沿：注销（无 token 可删 = 本会话未注册过，跳过）
      const token = registeredTokenThisSession;
      registeredTokenThisSession = null;
      if (token) void deletePushToken(token);
    }
  }, [isAuthenticated]);
}
