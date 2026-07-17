// useSafeBack - 带兜底的返回导航
// Why: 30+ 处 router.back() 无兜底，从通知/深链直接进入页面时 back 会退出 app
// 用法: const handleBack = useSafeBack(); <PrimaryHeader onBackPress={handleBack} />
import { useCallback } from 'react';
import { router } from 'expo-router';

export function useSafeBack(fallback = '/(main)/home') {
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [fallback]);
}
