/**
 * 引导页远程配置（P24 方案 D8）
 *
 * 本期占位：SLIDES 本地硬编码兜底，后端 GET /client/onboarding/slides
 * 排期就绪后实现 useOnboardingSlides() 切换（React Query, staleTime 1h）。
 * 接口契约见方案 md §11（enabled / version / slides[]）。
 */

/** 后端下发的单屏配置 */
export interface OnboardingSlideRemote {
  id: string;
  /** Material Symbol 名（前端校验 iconMapping 存在，未知兜底 storefront） */
  icon: string;
  /** 该屏强调色 hex（图标+角标底+渐变底），为空用 primary */
  accentColor: string;
  /** 标题 i18n key（三语言文案，不传明文） */
  titleKey: string;
  /** 描述 i18n key */
  descKey: string;
  /** 传则用图，null 用 icon+渐变底（默认推荐） */
  imageUrl: string | null;
  /** 末屏主按钮文案 key，null 用 onboarding.start */
  ctaKey: string | null;
}

/** GET /client/onboarding/slides 响应体 */
export interface OnboardingConfig {
  /** 运营一键开关引导页（false → app/index 跳过 onboarding 直接 login） */
  enabled: boolean;
  /** 内容版本号，前端缓存比对，变更才刷新 */
  version: number;
  slides: OnboardingSlideRemote[];
}

// TODO(后端排期后实现)：
// export function useOnboardingSlides() {
//   return useQuery({
//     queryKey: ['onboarding', 'slides'],
//     queryFn: () => api.get<OnboardingConfig>('/client/onboarding/slides'),
//     staleTime: 60 * 60 * 1000,
//   });
// }
// 落地方式：onboarding.tsx query 成功用远端 slides，失败/加载中用本地 SLIDES 兜底（首屏不阻塞）；
// app/index.tsx 路由守卫读 config.enabled，false 则跳过 onboarding 直接 login。
