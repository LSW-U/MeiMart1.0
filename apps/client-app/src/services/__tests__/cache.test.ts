import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/providers/queryClient';
import { clearAppCache, getCacheSize, getCacheSizeLabel, CACHE_KEY_NAMES } from '../cache';

// Why: cache service 是 AsyncStorage + queryClient 的薄封装，单测用真实 AsyncStorage
//      （jest preset 自带 @react-native-async-storage/async-storage/mock）+ spy queryClient.clear
const clearSpy = jest.spyOn(queryClient, 'clear');

async function seedCache(): Promise<void> {
  await AsyncStorage.setItem('meimart-react-query', 'x'.repeat(2048));
  await AsyncStorage.setItem('meimart.recentSearches', 'y'.repeat(512));
}

describe('cache service（P17 决策 3）', () => {
  beforeEach(async () => {
    clearSpy.mockClear();
    await Promise.all(CACHE_KEY_NAMES.map((k) => AsyncStorage.removeItem(k)));
  });

  it('统计两项缓存字节数之和', async () => {
    await seedCache();
    expect(await getCacheSize()).toBe(2048 + 512);
  });

  it('空缓存返回 0，label 显示 0 KB', async () => {
    expect(await getCacheSize()).toBe(0);
    expect(await getCacheSizeLabel()).toBe('0 KB');
  });

  it('KB 级格式化（不足 1 MB 至少显示 1 KB）', async () => {
    await AsyncStorage.setItem('meimart.recentSearches', 'z'.repeat(100));
    expect(await getCacheSizeLabel()).toBe('1 KB');
  });

  it('MB 级格式化保留 1 位小数', async () => {
    await AsyncStorage.setItem('meimart-react-query', 'x'.repeat(1024 * 1024 * 3 + 100 * 1024));
    expect(await getCacheSizeLabel()).toBe('3.1 MB');
  });

  it('clearAppCache 清两项 + queryClient.clear，不动 auth/app 偏好', async () => {
    await seedCache();
    await AsyncStorage.setItem('auth-storage', '{"token":"t"}');
    await AsyncStorage.setItem('app-storage', '{"locale":"zh"}');

    await clearAppCache();

    expect(await AsyncStorage.getItem('meimart-react-query')).toBeNull();
    expect(await AsyncStorage.getItem('meimart.recentSearches')).toBeNull();
    expect(clearSpy).toHaveBeenCalledTimes(1);
    // ⚠️ 偏好/登录态不能被清（清了会丢登录/语言/主题）
    expect(await AsyncStorage.getItem('auth-storage')).toBe('{"token":"t"}');
    expect(await AsyncStorage.getItem('app-storage')).toBe('{"locale":"zh"}');
  });
});
