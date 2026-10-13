/**
 * 引导页远程配置（方案「引导页内容可配置」批3，2026-10-14）
 *
 * GET /client/onboarding/slides（@Public）→ { success, data } 信封（api-core 响应拦截器
 * 统一剥层，res.data 即 OnboardingSlideRemote[]）。空表 [] → hook 转 null → 组件回退
 * 本地 SLIDES 兜底常量（在 app/onboarding.tsx，永不删除，方案 D5）。
 */
import { api, isMockMode } from './api';
import { mockResponse } from './mockDb';

/** 后端下发的单屏配置（批1 契约定稿：五语 en/pt/tet/id/zh；客户端 4 语无 id，取值走 localize 回退链补 en） */
export interface OnboardingSlideRemote {
  id: string;
  /** Material Symbol 名（null 配图屏走 storefront 兜底，见 onboarding.tsx fromRemote；非 null 名经 Icon→symbolToMc 查 iconMapping 表，未知名取查表结果） */
  icon: string | null;
  /** 配图 URL（slide-image 上传端点产出），null 走 icon+渐变底 */
  imageUrl: string | null;
  /** 五语标题（en 必填，服务端校验） */
  title: Record<string, string>;
  /** 五语描述（en 必填，服务端校验） */
  description: Record<string, string>;
  /** 排序（升序，服务端已排） */
  sortOrder: number;
  /** 启停（服务端只下发 enabled=true） */
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchOnboardingSlides(): Promise<OnboardingSlideRemote[]> {
  // mock 分支返回空表 → hook 转 null → 组件回退本地 SLIDES（保回退语义，任务书批3 改动#1）
  if (isMockMode) return mockResponse([]);
  const res = await api.get<OnboardingSlideRemote[]>('/client/onboarding/slides');
  return res.data;
}
