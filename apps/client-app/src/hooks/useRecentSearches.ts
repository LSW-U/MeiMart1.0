import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: P7 F1 - Recent Searches 持久化（决策 2-A AsyncStorage，与 locale 存储同源，无额外依赖）
const STORAGE_KEY = 'meimart.recentSearches';
const MAX_RECENT = 10;

/**
 * 搜索历史 hook —— AsyncStorage 持久化
 * - add：去重 + 最新在前 + 最多 10 条
 * - remove：单条删除
 * - clear：清空全部
 *
 * 首次挂载从 AsyncStorage 异步加载（loaded=false 期间 recentSearches=[]）。
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setRecentSearches(parsed.filter((s): s is string => typeof s === 'string'));
            }
          } catch {
            // Why: 存储损坏（非 JSON 或非数组），忽略用空数组
          }
        }
        setLoaded(true);
      })
      .catch(() => {
        // Why: AsyncStorage 读失败（极端情况），降级内存态
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (list: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Why: 写失败不影响内存态（下次 add 重试）
    }
  }, []);

  const addRecent = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== trimmed);
        const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const removeRecent = useCallback(
    (term: string) => {
      setRecentSearches((prev) => {
        const next = prev.filter((s) => s !== term);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    void persist([]);
  }, [persist]);

  return { recentSearches, loaded, addRecent, removeRecent, clearRecent };
}
