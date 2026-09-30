/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';

import { OfflineBanner } from '../../components/feedback/OfflineBanner';
import { useNetworkStore } from '../../hooks/useNetworkStore';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

/**
 * OfflineBanner 单测（批2 R-P1-3）：死信暴露 + 手动重试 + 放弃确认。
 * useOfflineQueue / network store / Toast mock；ConfirmDialog 渲染进 DOM（Modal 壳 visible 语义）。
 */

jest.mock('../../hooks/useNetworkStore', () => ({
  useNetworkStore: jest.fn(),
}));

jest.mock('../../hooks/useOfflineQueue', () => ({
  useOfflineQueue: jest.fn(),
}));

jest.mock('../../components/feedback/Toast', () => ({
  showToast: jest.fn(),
}));

// useTranslation 内部走 useRiderSettings（RQ）——直接 mock i18n 拿纯 t 函数（zh 字典查表）
jest.mock('../../i18n/useTranslation', () => ({
  useTranslation: () => ({
    // 单大括号插值 + 当前语言 → en → key 回退，对齐 useTranslation.ts 的 translate 语义
    t: (key: string, vars?: Record<string, string | number>) => {
      // 测试桩内联读 zh/en 字典（require 在 jsdom 可用；require() 调用非 import 语句，不违 import/first）
      const zh = require('../../i18n/locales/zh.json') as Record<string, string>;
      const en = require('../../i18n/locales/en.json') as Record<string, string>;
      const template = zh[key] || en[key] || key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (m: string, name: string) =>
        name in vars ? String(vars[name]) : m,
      );
    },
  }),
}));

const mockUseNetworkStore = useNetworkStore as unknown as jest.Mock;
const mockUseOfflineQueue = useOfflineQueue as unknown as jest.Mock;

function setup(
  overrides: {
    isOffline?: boolean;
    pendingCount?: number;
    deadCount?: number;
    flush?: jest.Mock;
    abandonFailed?: jest.Mock;
  } = {},
) {
  // useNetworkStore 是 zustand selector 形态（(s) => s.isOffline）——mock 需实现 selector 调用，
  // 返回 { isOffline } 整对象会让 selector 拿不到字段（isOffline 恒 undefined → falsy 误判在线）
  mockUseNetworkStore.mockImplementation((sel: (s: { isOffline: boolean }) => unknown) =>
    sel({ isOffline: overrides.isOffline ?? false }),
  );
  mockUseOfflineQueue.mockReturnValue({
    pendingCount: overrides.pendingCount ?? 0,
    deadCount: overrides.deadCount ?? 0,
    flush: overrides.flush ?? jest.fn(async () => ({ synced: 0, failed: 0 })),
    abandonFailed: overrides.abandonFailed ?? jest.fn(async () => 0),
  });
}

describe('OfflineBanner（R-P1-3）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('在线且无死信：不渲染', () => {
    setup();
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('离线有队列：显示待同步计数（i18n 插值）', () => {
    setup({ isOffline: true, pendingCount: 3 });
    render(<OfflineBanner />);
    expect(screen.getByText('离线中，3 条待同步')).toBeTruthy();
  });

  it('死信 >0：即使在线也渲染失败数 + 重试/放弃按钮', () => {
    setup({ isOffline: false, deadCount: 2 });
    render(<OfflineBanner />);
    expect(screen.getByText('2 条同步失败，需人工处理')).toBeTruthy();
    expect(screen.getByText('重试')).toBeTruthy();
    expect(screen.getByText('放弃失败项')).toBeTruthy();
  });

  it('手动重试：调 flush；仍有失败弹 partial toast', async () => {
    const flush = jest.fn(async () => ({ synced: 0, failed: 1 }));
    setup({ deadCount: 2, flush });
    render(<OfflineBanner />);
    fireEvent.click(screen.getByText('重试'));
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('放弃：需经 ConfirmDialog 确认后才调 abandonFailed', async () => {
    const abandonFailed = jest.fn(async () => 2);
    setup({ deadCount: 1, abandonFailed });
    render(<OfflineBanner />);
    fireEvent.click(screen.getByText('放弃失败项'));
    // 确认前不调
    expect(abandonFailed).not.toHaveBeenCalled();
    // 弹窗确认文案出现，点击确认
    fireEvent.click(screen.getByText('确认放弃'));
    await Promise.resolve();
    expect(abandonFailed).toHaveBeenCalledTimes(1);
  });
});
