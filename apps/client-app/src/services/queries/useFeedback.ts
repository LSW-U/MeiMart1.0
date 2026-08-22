import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@/store/toastStore';

export interface FeedbackSubmitInput {
  category: string;
  content: string;
  contact?: string;
  images?: string[];
}

// V12 反馈提交 mutation 骨架
// TODO(F1): 后端反馈端点就绪后，将 mutationFn 改为 POST /client/feedback（见后端依赖清单 F1）
// 当前端点未就绪：mutationFn 抛错 → onError toast 提示"提交失败请稍后重试"
// 端点就绪后改 mutationFn 为 api.post('/client/feedback', input) 即通
//
// ── 就绪检查清单（端点上线时逐项做，防 TODO 被遗忘）──
// 1. mutationFn 改 `const res = await api.post('/client/feedback', input); return res.data;`（_input 改名 input 透传）
// 2. 对照后端响应契约补返回类型（当前 void 语义）
// 3. __tests__/useFeedback.test.tsx 补成功路径测试（mock api.post 成功 → onSuccess 可达）
// 4. 删本 TODO 块 + 后端依赖清单 F1 勾销
export function useSubmitFeedback() {
  const { t } = useTranslation();
  return useMutation({
    // _input：骨架阶段未透传；后端就绪改名 input 并透传（见上方就绪清单 1）
    mutationFn: async (_input: FeedbackSubmitInput) => {
      // TODO(F1): return api.post('/client/feedback', input)
      throw new Error('FEEDBACK_ENDPOINT_NOT_READY');
    },
    onError: () => {
      toast.error(
        t('service.feedback.submitFailed', { defaultValue: 'Submit failed, please try again later' }),
      );
    },
  });
}
