import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecentSearches } from '../useRecentSearches';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useRecentSearches', () => {
  it('starts empty when no storage', () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('addRecent prepends new term and persists', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      result.current.addRecent('Fos Lais');
    });
    expect(result.current.recentSearches).toEqual(['Fos Lais']);
    // Why: 持久化到 AsyncStorage
    const raw = await AsyncStorage.getItem('meimart.recentSearches');
    expect(JSON.parse(raw ?? '[]')).toEqual(['Fos Lais']);
  });

  it('addRecent dedupes and moves existing to front', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      result.current.addRecent('Fos Lais');
      result.current.addRecent('Coffee');
      result.current.addRecent('Fos Lais'); // 重复 -> 移到最前
    });
    expect(result.current.recentSearches).toEqual(['Fos Lais', 'Coffee']);
  });

  it('addRecent caps at 10 entries (oldest dropped)', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      for (let i = 1; i <= 12; i++) {
        result.current.addRecent(`term-${i}`);
      }
    });
    expect(result.current.recentSearches).toHaveLength(10);
    expect(result.current.recentSearches[0]).toBe('term-12'); // 最新在前
    expect(result.current.recentSearches).not.toContain('term-1'); // 最旧被淘汰
    expect(result.current.recentSearches).not.toContain('term-2');
  });

  it('removeRecent removes single term', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      result.current.addRecent('Fos Lais');
      result.current.addRecent('Coffee');
      result.current.removeRecent('Fos Lais');
    });
    expect(result.current.recentSearches).toEqual(['Coffee']);
  });

  it('clearRecent empties all and persists', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      result.current.addRecent('Fos Lais');
      result.current.clearRecent();
    });
    expect(result.current.recentSearches).toEqual([]);
    const raw = await AsyncStorage.getItem('meimart.recentSearches');
    expect(JSON.parse(raw ?? '[]')).toEqual([]);
  });

  it('loads from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem('meimart.recentSearches', JSON.stringify(['saved-term']));
    const { result } = renderHook(() => useRecentSearches());
    // Why: 异步加载，等 loaded
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.recentSearches).toEqual(['saved-term']);
  });

  it('addRecent ignores empty/whitespace', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await act(async () => {
      result.current.addRecent('   ');
      result.current.addRecent('');
    });
    expect(result.current.recentSearches).toEqual([]);
  });
});
