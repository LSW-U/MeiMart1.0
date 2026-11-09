// useSafeBack - 带兜底的返回导航
// Why: 30+ 处 router.back() 无兜底，从通知/深链直接进入页面时 back 会退出 app
// 用法: const handleBack = useSafeBack(); <PrimaryHeader onBackPress={handleBack} />
import { useCallback } from 'react';
import { router } from 'expo-router';

// Why: 20261109 拍板 B1 —— 兜底从 home 改 profile：栈断（web 刷新/深链/通知直进）时
//   回「我的账户」比回首页更贴用户心智（个人中心是各入口页的上级语义），且 profile 是
//   tab 页自身不会断栈，不会出现兜底后再断栈。32 处调用全量受益，无需逐页传参。
export function useSafeBack(fallback = '/(main)/profile') {
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }, [fallback]);
}
