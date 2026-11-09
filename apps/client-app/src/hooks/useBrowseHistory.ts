import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: 20261109 融合页 B1 拍板 —— 浏览历史纯前端本地实现（后端无浏览记录端点/模型，
//   详情页上报 + AsyncStorage 持久化；后续后端做浏览历史端点再切数据源）。
//   模式复用 useRecentSearches（P7 F1 先例：AsyncStorage 同源、读失败降级内存态）。
const STORAGE_KEY = 'meimart.browseHistory';
const MAX_HISTORY = 50;

export interface BrowseHistoryEntry {
  id: string;
  viewedAt: number; // epoch ms，去重置顶用
}

/**
 * 浏览历史 hook —— AsyncStorage 持久化
 * - record：去重（同 id 置顶刷新时间）+ 上限 50 条
 * - 首次挂载异步加载（loaded=false 期间 entries=[]）
 */
export function useBrowseHistory() {
  const [entries, setEntries] = useState<BrowseHistoryEntry[]>([]);
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
              setEntries(
                parsed.filter(
                  (e): e is BrowseHistoryEntry =>
                    e && typeof e.id === 'string' && typeof e.viewedAt === 'number',
                ),
              );
            }
          } catch {
            // Why: 存储损坏（非 JSON），忽略用空数组
          }
        }
        setLoaded(true);
      })
      .catch(() => {
        // Why: 读失败（极端情况），降级内存态
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (list: BrowseHistoryEntry[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Why: 写失败不影响内存态
    }
  }, []);

  const record = useCallback(
    (productId: string) => {
      if (!productId) return;
      setEntries((prev) => {
        const next = [
          { id: productId, viewedAt: Date.now() },
          ...prev.filter((e) => e.id !== productId),
        ].slice(0, MAX_HISTORY);
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setEntries([]);
    void persist([]);
  }, [persist]);

  return { entries, loaded, record, clear };
}

// 供详情页非 hook 上下文（或避免 hook 依赖链）直接上报的单例写入口
let reportListener: ((productId: string) => void) | null = null;

export function bindBrowseHistoryReporter(fn: (productId: string) => void) {
  reportListener = fn;
}

export function reportProductView(productId: string) {
  reportListener?.(productId);
}
