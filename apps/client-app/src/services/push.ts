/**
 * Push 通知模块（批B B1/B2，方案v2 §3.5 client）
 *
 * 职责：
 *   B1 — Expo PushToken 获取 + 权限申请 + POST/DELETE /client/device-tokens
 *        （契约 RegisterDeviceTokenRequest/DeviceTokenItem，批A A1 产出）
 *   B2 — 推送点击深链：前台/后台 addNotificationResponseListener + 冷启动
 *        getLastNotificationResponseAsync。routeFromPushData 与 notifications.tsx
 *        页面 onPress（P23）是两份实现，分流规则保持一致（order→订单详情/列表、
 *        promotion→商品详情/券页、未知降级通知页）；来源真合一留后续批（审查
 *        P3-1 注记，改动前勿据「单一来源」表述去删页面 onPress）
 *
 * 失败容忍：注册/注销失败一律 catch 静默，绝不打断登录/登出主流程
 * （任务书 B1「注册失败静默降级」）；Expo token 获取失败（无 GMS/离线）同款降级。
 *
 * mock 模式（isMockMode）：跳过 expo-notifications 原生调用（jest/jsdom 无原生模块），
 * token 注册/注销直接返回成功——通知站内信链路不受影响。
 */
import { Platform } from 'react-native';
import { api, isMockMode } from './api';
import { getCurrentLocale } from '@/i18n';
import { getExtra } from '@/config/app-config';

// Why: 延迟 require 而非顶层 import —— expo-notifications 需要原生模块，
// jsdom 测试环境（以及未来可能的 web 无原生壳场景）顶层 import 会在模块加载期即崩，
// 挂 listener 的组件层用 shouldInitPush() 判断后才会触达本模块。
type NotificationsModule = typeof import('expo-notifications');

export function getNotificationsModule(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 原因：原生模块延迟加载（见上）
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** 原生推送能力是否可用（native + 非 mock）；listener/token 注册调用前先判 */
export function shouldInitPush(): boolean {
  return !isMockMode && Platform.OS !== 'web';
}

/** 后端契约平台枚举（api-types DeviceTokenPlatform） */
type DevicePlatform = 'ANDROID' | 'IOS' | 'WEB';

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}

/** locale 快照（契约枚举 en/zh/id/pt/tet；客户端 SUPPORTED_LOCALES 是 zh/en/tet/pt，直传合法值） */
function currentLocaleSnapshot(): 'en' | 'zh' | 'id' | 'pt' | 'tet' {
  return getCurrentLocale();
}

/** 通知权限：已授权直接过；未决/拒绝则请求一次（Android 13+ 运行时权限 / iOS 弹窗） */
async function ensurePermissions(notifications: NotificationsModule): Promise<boolean> {
  try {
    const existing = await notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    // 权限查询失败（老设备/模拟器无通知服务）按未授权处理，不阻塞 token 注册重试链
    return false;
  }
}

/**
 * 取 Expo PushToken（权限通过才有意义；projectId 来自 app.json extra.eas）
 * 返回 null = 不可注册（无权限/无projectId/Expo 服务失败），调用方静默跳过
 */
export async function fetchExpoPushToken(): Promise<string | null> {
  if (!shouldInitPush()) return null;
  const notifications = getNotificationsModule();
  if (!notifications) return null;

  const granted = await ensurePermissions(notifications);
  if (!granted) return null;

  try {
    const projectId = getExtra()?.eas?.projectId;
    if (!projectId) return null;
    const token = await notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch {
    // 离线/无 GMS/Expo 服务不可达：静默 null（重试由下次登录/前台刷新触发）
    return null;
  }
}

/** 后端注册/注销响应 data（DeviceTokenItem） */
interface DeviceTokenItem {
  id: string;
  platform: DevicePlatform;
  locale: string;
  status: string;
  lastSeenAt: string;
}

/**
 * 注册推送 token 到后端（upsert by token 幂等——换账号/重装刷新归属，不产生重复行）
 * @returns 注册成功 true；失败 false（调用方静默降级）
 */
export async function registerPushToken(pushToken: string): Promise<boolean> {
  if (isMockMode) return true;
  try {
    await api.post<DeviceTokenItem>('/client/device-tokens', {
      token: pushToken,
      platform: currentPlatform(),
      locale: currentLocaleSnapshot(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 注销推送 token（登出时调用；后端按 token 删 + 归属校验，幂等）
 * 失败静默：token 残留由后端 receipts NotRegistered → INVALID 兜底（方案 §6 风险3）
 */
export async function deletePushToken(pushToken: string): Promise<void> {
  if (isMockMode) return;
  try {
    await api.delete('/client/device-tokens', { data: { token: pushToken } });
  } catch {
    // 静默（登出主流程不受影响）
  }
}

// ============================================================================
// B2 深链路由（复用 P23 onPress 逻辑——单一事实来源，页面层同款分流）
// ============================================================================

/** 推送 data 可识别字段（与站内信 Notification.data 同源：orderId/productId） */
export interface PushRoute {
  /** expo-router push 目标；null = 无可识别 data（调用方降级通知页） */
  path: string | null;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * 推送 data → 路由（P23 onPress 同款分流）：
 *   order + orderId → /order/:id；order 无 id → /(main)/orders
 *   promotion + productId → /product/:id；promotion 无 id → /coupons
 *   未知 type / 无 data → null（调用方降级进通知页，不报错）
 */
export function routeFromPushData(
  data: Record<string, unknown> | undefined | null,
  type?: string,
): PushRoute {
  if (!data) return { path: null };
  const orderId = str(data.orderId);
  const productId = str(data.productId);
  if (type === 'ORDER_UPDATE' || (type === undefined && orderId)) {
    return { path: orderId ? `/order/${orderId}` : '/(main)/orders' };
  }
  if (type === 'PROMOTION' || (type === undefined && productId)) {
    return { path: productId ? `/product/${productId}` : '/coupons' };
  }
  return { path: null };
}
