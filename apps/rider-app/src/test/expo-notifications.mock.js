/**
 * expo-notifications mock（web project / jsdom 用）
 *
 * Why: 批C C3 push-token.ts / push-deep-link.ts 顶层 import expo-notifications
 * （ESM 发布 + 原生宿主，jsdom 无 runtime → "Cannot use import statement
 * outside module"）。测试只需要：
 *   - setNotificationHandler 可调用（模块顶层执行）
 *   - getExpoPushTokenAsync 可控（mockExpoToken 注入 token / mockExpoTokenError 注入失败）
 *   - addNotificationResponseReceivedListener 返回可 remove 的订阅
 *   - getLastNotificationResponseAsync 可控（mockLastResponse 注入冷启动 response）
 */
let expoTokenResult = { data: 'ExponentPushToken[test-token]' };
let expoTokenError = null;
let lastResponse = null;
// 批C 审查 P2-1：权限申请可控桩（granted 直通 / pending 走 requestPermissionsAsync）
let permissionResult = { granted: true };
let requestPermissionsResult = { granted: true };
let requestPermissionsCalls = 0;
const listeners = [];

export function __setPermission(result) {
  permissionResult = result;
}

export function __setRequestPermissionsResult(result) {
  requestPermissionsResult = result;
}

export function __getRequestPermissionsCalls() {
  return requestPermissionsCalls;
}

export function __setExpoToken(result) {
  expoTokenResult = result;
}

export function __setExpoTokenError(error) {
  expoTokenError = error;
}

export function __setLastResponse(response) {
  lastResponse = response;
}

export function __getListeners() {
  return listeners;
}

export function __reset() {
  expoTokenResult = { data: 'ExponentPushToken[test-token]' };
  expoTokenError = null;
  lastResponse = null;
  permissionResult = { granted: true };
  requestPermissionsResult = { granted: true };
  requestPermissionsCalls = 0;
  listeners.length = 0;
}

export async function getPermissionsAsync() {
  return permissionResult;
}

export async function requestPermissionsAsync() {
  requestPermissionsCalls += 1;
  return requestPermissionsResult;
}

export async function getExpoPushTokenAsync() {
  if (expoTokenError) throw expoTokenError;
  return expoTokenResult;
}

export function setNotificationHandler(_handler) {
  // 模块顶层调用即可，无需记录（jsdom 无前台展示语义）
}

export function addNotificationResponseReceivedListener(listener) {
  listeners.push(listener);
  return { remove: () => {
    const i = listeners.indexOf(listener);
    if (i >= 0) listeners.splice(i, 1);
  } };
}

export async function getLastNotificationResponseAsync() {
  return lastResponse;
}
