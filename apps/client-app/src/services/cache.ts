// App 缓存统计与清理（P17 决策 3 —— 第一期无新增依赖范围）
// Why: 只统计/清理「可安全清除」的 AsyncStorage 项（React Query 持久化 + 最近搜索）。
//      ⚠️ 绝不能清 auth-storage / app-storage —— 那会连带清掉登录态/语言/主题/onboarding。
//      expo-image 磁盘缓存不在本期（需 expo-file-system，见后端依赖清单 B5）。
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/providers/queryClient';

const CACHE_KEYS = ['meimart-react-query', 'meimart.recentSearches'] as const;

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    const kb = Math.max(1, Math.round(bytes / 1024));
    return `${kb} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/** 统计可清缓存总字节数（字符串长度 ≈ UTF-16 字节，展示用途足够） */
export async function getCacheSize(): Promise<number> {
  const sizes = await Promise.all(
    CACHE_KEYS.map(async (key) => {
      const raw = await AsyncStorage.getItem(key);
      return raw ? raw.length : 0;
    }),
  );
  return sizes.reduce((sum, n) => sum + n, 0);
}

export async function getCacheSizeLabel(): Promise<string> {
  return formatBytes(await getCacheSize());
}

/** 清理可清缓存：AsyncStorage 两项 + 内存 queryClient。保留 auth/app 偏好数据。 */
export async function clearAppCache(): Promise<void> {
  await Promise.all(CACHE_KEYS.map((key) => AsyncStorage.removeItem(key)));
  queryClient.clear();
}

export const CACHE_KEY_NAMES = CACHE_KEYS;
