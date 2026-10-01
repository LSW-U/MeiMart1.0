/**
 * 深链白名单校验（跨端基建统一 批3 A6）：实现上收共享包 @meimart/nav-core
 * （SAFE_ID_PATTERN + safeRoutePush；本文件保留既有导出名——safeDeepLink 等
 * rider 消费方零改动，SAFE_ID_PATTERN 唯一定义点迁包内，本处 re-export 防双源）。
 */
import type { Href } from 'expo-router';
import { SAFE_ID_PATTERN } from '@meimart/nav-core';

export { SAFE_ID_PATTERN } from '@meimart/nav-core';

/** 已知安全前缀（精确/带安全 id 的动态段）——rider 侧路由表，原样保留 */
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
  // /order/{orderId} 动态段校验（SAFE_ID_PATTERN 已上收 nav-core 单源）
  const orderMatch = /^\/order\/([A-Za-z0-9-]{1,40})$/.exec(link);
  if (orderMatch && SAFE_ID_PATTERN.test(orderMatch[1])) {
    return link as Href;
  }
  return null;
}
