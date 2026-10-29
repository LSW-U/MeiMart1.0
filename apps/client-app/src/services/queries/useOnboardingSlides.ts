/**
 * useOnboardingSlides - 引导页远程配置 hook（方案「引导页内容可配置」批3，2026-10-14）
 *
 * 后端：GET /client/onboarding/slides（@Public，信封 {success,data}，api 拦截器已剥层）
 *   - 失败或空数组 → 返回 null，组件回退本地 SLIDES 兜底（首屏不阻塞）
 *   - staleTime 1h（运营低频变更）+ offlineFirst（弱网降级，同 useSearchHot 模式）
 */
import { useQuery } from '@tanstack/react-query';
import { fetchOnboardingSlides } from '@/services/onboarding';
import { STALE_TIME, ONBOARDING_SLIDES_KEY } from '@/lib/queryKeys';

export function useOnboardingSlides() {
  return useQuery({
    queryKey: ONBOARDING_SLIDES_KEY,
    queryFn: fetchOnboardingSlides,
    staleTime: STALE_TIME.onboardingSlides,
    networkMode: 'offlineFirst',
    // Why: 失败/空表都归一为 null（回退语义），组件侧 `remoteSlides ?? SLIDES` 单一判空
    select: (data) => (data && data.length > 0 ? data : null),
  });
}
