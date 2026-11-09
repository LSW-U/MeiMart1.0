import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Why: 20261109 融合页 B1 拍板 —— 浏览历史纯前端本地实现（后端无浏览记录端点/模型，
//   详情页上报 + AsyncStorage 持久化；后续后端做浏览历史端点再切数据源）。
//   模式复用 useRecentSearches（P7 F1 先例：AsyncStorage 同源、读失败降级内存态）。
//
// 20261109 修复：原实现 reportProductView 走「单例 listener 转发」（bindBrowseHistoryReporter
//   需 history 页先挂载绑定），详情页先访问时 listener=null 静默丢记录——断链实锤。
//   改为模块级直写：report 直接读 STORAGE_KEY → 合并去重置顶 → 写回，任何挂载时序都不断链；
//   hook 的 record 复用同一模块级函数（单写路径），页面加载时读同一 key 自然可见新记录。
const STORAGE_KEY = 'meimart.browseHistory';
const MAX_HISTORY = 50;

export interface BrowseHistoryEntry {
  id: string;
  viewedAt: number; // epoch ms，去重置顶用
}

/** 模块级直写：读盘 → 去重置顶 → 截 50 → 写回。fire-and-forget，永不 throw。 */
async function appendBrowseHistory(productId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let prev: BrowseHistoryEntry[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          prev = parsed.filter(
            (e): e is BrowseHistoryEntry =>
              e && typeof e.id === 'string' && typeof e.viewedAt === 'number',
          );
        }
      } catch {
        // Why: 存储损坏（非 JSON），当空列表重建
      }
    }
    const next = [
      { id: productId, viewedAt: Date.now() },
      ...prev.filter((e) => e.id !== productId),
    ].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Why: 读写失败静默（浏览记录可丢，绝不影响详情页主流程）
  }
}

/**
 * 浏览历史 hook —— AsyncStorage 持久化
 * - record：复用模块级 appendBrowseHistory（与详情页上报同一写路径）
 * - 首次挂载异步加载（loaded=false 期间 entries=[]）；读失败降级内存空态
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
      // 乐观更新内存态（即时反馈）+ 落盘走模块级同路径（详情页/页面内双入口写一致）
      setEntries((prev) => [
        { id: productId, viewedAt: Date.now() },
        ...prev.filter((e) => e.id !== productId),
      ]);
      void appendBrowseHistory(productId);
    },
    // appendBrowseHistory 是模块级纯函数，无依赖
    [],
  );

  const clear = useCallback(() => {
    setEntries([]);
    void persist([]);
  }, [persist]);

  return { entries, loaded, record, clear };
}

// Why: 20261109 修复 —— 详情页非 hook 上下文直接调模块级直写（原单例转发断链已删，
//   详情页调用行不变：reportProductView(id)）
export function reportProductView(productId: string) {
  if (!productId) return;
  void appendBrowseHistory(productId);
}
