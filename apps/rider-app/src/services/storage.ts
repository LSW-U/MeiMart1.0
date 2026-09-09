/**
 * 存储适配层（后续批 N5H4，方案 v2 §5 H4）
 *
 * 统一本地 KV 存储：native（Hermes 无 localStorage）走 @react-native-async-storage/async-storage，
 * web（jsdom / 浏览器）走 localStorage 兜底。修复「语言记忆 localStorage 手读在真机恒失效」：
 * settings/notification/push-token 此前各自 `typeof localStorage !== 'undefined'` 手读，
 * native 分支永远跳过 → 语言/通知偏好真机不持久化。
 *
 * Why AsyncStorage 不进 package.json：client-app 已声明 2.2.0 且根 hoisted 单副本
 * （与 push-token.ts 头注 expo-device 同款先例——workspace 根包可解析，不重复声明）。
 * jest：rn/web 双 project 经 moduleNameMapper 映射到官方 jest mock
 * （node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js）。
 *
 * Why 同步 get：settings 的 getMockSettings 是同步缓存层（mockSettings 内存态优先，
 * 首次落到持久化的读取由 ensureSettingsHydrated 在模块加载后异步完成一次，
 * 之后全走内存态——调用方拿到的是同一份数据，无需 await）。
 */
import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }
      return await AsyncStorage.getItem(key);
    } catch {
      // 存储失败不炸调用方（老设备/无宿主环境），按未存储处理
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // 写失败容忍：配额满/私有模式等，静默降级为内存态
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // 删失败容忍：下次写覆盖同 key，无残留风险
    }
  },
};
