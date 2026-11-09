/**
 * useBrowseHistory 单测（20261109 修复：reportProductView 模块级直写）
 *
 * 用真 AsyncStorage（jest-expo web 环境，useRecentSearches.test 先例），
 * 不 mock——report→落盘→hook 读回全链路即回归线。
 *
 * 验证：
 *   1. reportProductView → AsyncStorage 写入（原单例转发断链回归线：不依赖任何页面先挂载）
 *   2. 去重置顶 / 上限 50 / clear / 存储损坏降级
 *   3. hook 加载可见 report 写入的记录（跨页面可见性）
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useBrowseHistory, reportProductView } from '../useBrowseHistory';

const KEY = 'meimart.browseHistory';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('reportProductView（模块级直写）', () => {
  it('report → AsyncStorage 写入记录（不依赖 history 页先挂载——原断链回归线）', async () => {
    reportProductView('p1');
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(KEY);
      expect(raw).not.toBeNull();
    });
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) as string);
    expect(saved).toEqual([{ id: 'p1', viewedAt: expect.any(Number) }]);
  });

  it('空 id → 不写', async () => {
    reportProductView('');
    await new Promise((r) => setTimeout(r, 20));
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('去重置顶：重复浏览同 id → 刷新时间且唯一置顶', async () => {
    reportProductView('p1');
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).not.toBeNull());
    const firstAt = JSON.parse((await AsyncStorage.getItem(KEY)) as string)[0].viewedAt;
    await new Promise((r) => setTimeout(r, 5)); // 保证 viewedAt 可区分
    reportProductView('p2');
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string).length).toBe(2),
    );
    reportProductView('p1');
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string)[0].id).toBe('p1'),
    );
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) as string);
    expect(saved.map((e: { id: string }) => e.id)).toEqual(['p1', 'p2']);
    expect(saved[0].viewedAt).toBeGreaterThan(firstAt);
  });

  it('上限 50：第 51 条进入时最旧被裁', async () => {
    for (let i = 1; i <= 51; i++) {
      reportProductView(`p${i}`);
      // 串行等待写回，防并发 read-modify-write 丢更新
      await waitFor(async () =>
        expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string).length).toBe(
          Math.min(i, 50),
        ),
      );
    }
    const saved = JSON.parse((await AsyncStorage.getItem(KEY)) as string);
    expect(saved.length).toBe(50);
    expect(saved[0].id).toBe('p51');
    expect(saved.some((e: { id: string }) => e.id === 'p1')).toBe(false);
  });
});

describe('useBrowseHistory hook', () => {
  it('挂载加载：report 先行写入 → hook 可见（跨页面可见性）', async () => {
    reportProductView('p1');
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).not.toBeNull());
    const { result } = renderHook(() => useBrowseHistory());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.entries).toEqual([{ id: 'p1', viewedAt: expect.any(Number) }]);
  });

  it('record → 内存态即时更新 + 落盘同路径', async () => {
    const { result } = renderHook(() => useBrowseHistory());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => result.current.record('p1'));
    expect(result.current.entries.map((e) => e.id)).toEqual(['p1']);
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).not.toBeNull());
    expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string)[0].id).toBe('p1');
  });

  it('clear → 内存清空 + 落盘空数组', async () => {
    reportProductView('p1');
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).not.toBeNull());
    const { result } = renderHook(() => useBrowseHistory());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(KEY)) as string)).toEqual([]),
    );
  });

  it('存储损坏（非 JSON）→ 降级空态不崩', async () => {
    await AsyncStorage.setItem(KEY, 'not-json{{{');
    const { result } = renderHook(() => useBrowseHistory());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.entries).toEqual([]);
  });
});
