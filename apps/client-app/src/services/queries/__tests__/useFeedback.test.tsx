/**
 * useSubmitFeedback 独立测试（F4：审查发现 hook 无守护——页面测试 mock 掉了 hook，
 * 真实 mutationFn 恒抛错的行为没有测试覆盖）
 *
 * 当前骨架阶段：mutationFn 恒抛 FEEDBACK_ENDPOINT_NOT_READY → onError toast。
 * 后端 F1 端点就绪后：把 mutationFn 改为 api.post 后补成功路径测试（见 useFeedback.ts TODO 就绪清单）。
 */
import { act } from '@testing-library/react-native';
import { renderHookWithClient, createTestQueryClient } from './testHarness';
import { useSubmitFeedback } from '../useFeedback';
import { toast } from '@/store/toastStore';

// 页面测试 mock t 返 key 模式（断言 toast 收到 submitFailed key）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

describe('useSubmitFeedback（V12 骨架 — 端点未就绪恒抛错）', () => {
  beforeEach(() => {
    (toast.error as jest.Mock).mockClear();
  });

  it('mutate 恒抛 FEEDBACK_ENDPOINT_NOT_READY（端点未就绪的真实行为）', async () => {
    const client = createTestQueryClient();
    const { result } = renderHookWithClient(() => useSubmitFeedback(), client);

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          category: 'FEATURE',
          content: 'x'.repeat(12),
          images: ['https://mock-minio.local/1.jpg'],
        });
      }),
    ).rejects.toThrow('FEEDBACK_ENDPOINT_NOT_READY');
  });

  it('抛错时 onError 触发 toast.error(submitFailed)（不静默失败，弱网规则 12）', async () => {
    const client = createTestQueryClient();
    const { result } = renderHookWithClient(() => useSubmitFeedback(), client);

    await act(async () => {
      result.current.mutate({ category: 'FEATURE', content: 'x'.repeat(12) });
      // 等 mutation 走完 onError（mutate 返回 void，错误由 onError 消化）
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(toast.error).toHaveBeenCalledWith('service.feedback.submitFailed');
  });

  it('isPending 生命周期：mutate 后短暂 pending 再回 false', async () => {
    const client = createTestQueryClient();
    const { result } = renderHookWithClient(() => useSubmitFeedback(), client);

    expect(result.current.isPending).toBe(false);
    await act(async () => {
      result.current.mutate({ category: 'OTHER', content: 'x'.repeat(12) });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.isPending).toBe(false);
  });
});
