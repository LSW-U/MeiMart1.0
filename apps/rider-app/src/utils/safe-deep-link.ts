import type { Href } from 'expo-router';

/**
 * 深链白名单校验（D8 批4，R-P3-8）：服务端/推送下发的 link 字符串不得直接拼进
 * router.push——白名单只放行本 App 已知安全前缀，orderId 段额外限
 * ^[A-Za-z0-9-]{1,40}$（防 `/order/../...`、`%` 编码、超长注入等）。
 *
 * 返回类型安全的 Href 或 null（调用方丢弃非法 link，仅做标记已读等降级动作）。
 * order detail 用 TypedRoutes 排除法：白名单正则已限定字符集，运行时校验 +
 * `as Href` 收窄一次并集中在此处（原三处散落的裸 as Href 全部收敛到本函数）。
 */
/** orderId 白名单（P3-3：唯一定义点——push-deep-link/notification.ts 均复用本常量，防双源漂移） */
export const SAFE_ID_PATTERN = /^[A-Za-z0-9-]{1,40}$/;

/** 已知安全前缀（精确/带安全 id 的动态段） */
export function safeDeepLink(link: string): Href | null {
  // 固定路由（无动态段）
  const STATIC_ROUTES: readonly string[] = [
    '/(main)/earnings',
    '/(main)/tasks',
    '/(main)/profile',
    '/notifications',
  ];
  if ((STATIC_ROUTES as readonly string[]).includes(link)) {
    return link as Href;
  }
  // /order/{orderId} 动态段校验
  const orderMatch = /^\/order\/([A-Za-z0-9-]{1,40})$/.exec(link);
  if (orderMatch && SAFE_ID_PATTERN.test(orderMatch[1])) {
    return link as Href;
  }
  return null;
}
