/**
 * 推送 token 注册/注销服务（批C C3，方案v2 §3.5 rider）
 *
 * 流程：
 *   - 登录后 registerPushToken()：expo-notifications getExpoPushTokenAsync
 *     （projectId fallback app.json extra.eas.projectId）→ POST /rider/device-tokens
 *     {token, platform: ANDROID|IOS|WEB, locale}（upsert by token 幂等）
 *   - 登出 unregisterPushToken()：DELETE /rider/device-tokens {token}（幂等）
 *
 * 挂点：useAuthStore.isAuthenticated 变化驱动（root _layout 订阅，见 push-registration.ts hook）。
 * 平台守卫：web 无 APNs/FCM 通道（getExpoPushTokenAsync 会抛 ERR_UNAVAILABLE）→ 跳过；
 * 模拟器（Device.isDevice=false）无推送凭证 → 跳过。
 * mock 模式跳过（无后端 token 行可写）。
 * 全链 try/catch 失败容忍：推送注册失败不阻塞登录/登出主流程（console.warn 降噪）。
 *
 * Why expo-device 不进 package.json：SDK 56 hoisted 安装下 expo-notifications 运行时
 * 自带 expo-device 同依赖（peer 全放行），isDevice 判断走 workspace 根包；
 * 与 client-app pending-deps.md「装了无源码 import」的先例一致，不额外声明。
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api, isMockMode } from './api';
import { getCurrentLanguage } from './settings';
import type { AppLanguage } from './settings';

// rid 前缀 = FCM/APNs 设备 token（getDevicePushTokenAsync），非 Expo PushToken——
// 后端 Expo 通道只认 ExpoPushToken（ExponentPushToken[...]），rid 直接发会失败，跳过注册
function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

function platformOf(): 'ANDROID' | 'IOS' | 'WEB' {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return 'WEB';
}

/** 当前语言（N5：settings 语言运行时模块态——原 localStorage 手读真机恒 en，审查 P3-2 同源） */
function currentLocale(): AppLanguage {
  return getCurrentLanguage();
}

/** 已注册的 Expo token（登出 DELETE body 需要原 token；内存态，app 进程内有效） */
let registeredToken: string | null = null;

// 批C 审查 P2-1：Android 13+ POST_NOTIFICATIONS / iOS 首次授权必须显式申请，
// 否则 token 注册成功但系统永远不弹通知（静默失败）。对齐 client push.ts ensurePermissions：
// 已授权直通 → 未授权 requestPermissionsAsync → 拒绝/查询失败按未授权处理（静默降级）。
async function ensurePermissions(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    // 权限查询失败（老设备/模拟器无通知服务）按未授权处理
    return false;
  }
}

export async function registerPushToken(): Promise<void> {
  if (isMockMode || Platform.OS === 'web' || !Device.isDevice) return;
  try {
    if (!(await ensurePermissions())) {
      console.warn('[push-token] notification permission not granted, skip register');
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    );
    if (!token || !isExpoPushToken(token)) {
      console.warn('[push-token] non-expo token skipped:', token?.slice(0, 12));
      return;
    }
    registeredToken = token;
    await api.post('/rider/device-tokens', {
      token,
      platform: platformOf(),
      locale: currentLocale(),
    });
  } catch (e) {
    // 失败容忍：权限拒绝/网络挂/无凭证 env 均不阻塞登录
    console.warn('[push-token] register failed:', (e as Error).message);
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (isMockMode || Platform.OS === 'web') return;
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await api.delete('/rider/device-tokens', { data: { token } });
  } catch (e) {
    // 失败容忍：登出不被注销失败阻塞；后端幂等，下次登出重试无副作用
    console.warn('[push-token] unregister failed:', (e as Error).message);
  }
}
