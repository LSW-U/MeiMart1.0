import { useQuery } from '@tanstack/react-query';
import { promotionApi } from '@/services/promotion';

// Why: PromoDock 活动入口 hook — 跟 useCategories/useBanners 同模式（service 层 mock 切换 + offlineFirst）
//      方案 §2.5 + §6.7。后端 /client/home-entries 已就绪，service 层 isMockMode 切换已生效。
export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionApi.getPromotions(),
    staleTime: 10 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}
