import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
import { getCurrentLocale } from '@/i18n';
import type { Banner, Category } from '@/types';

// Why: 后端 Category/Banner 字段名与前端类型不同，service 层做转换避免改组件代码。
interface CategoryRaw {
  id: string;
  name: Record<string, string>;
  iconUrl: string;
  parentId: string | null;
  sortOrder: number;
  status?: 'ACTIVE' | 'INACTIVE';
  // Why: P3 - 后端 listCategoryTree 返嵌套 children（子分类），平铺模式（admin）无此字段
  children?: CategoryRaw[];
}

interface BannerRaw {
  id: string;
  imageUrl: string;
  alt: Record<string, string> | null;
  linkType: 'PRODUCT' | 'CATEGORY' | 'URL' | 'NONE';
  linkValue: string | null;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

function pickLocalized(raw: Record<string, string> | null | undefined, fallback = ''): string {
  if (!raw) return fallback;
  const locale = getCurrentLocale();
  return raw[locale] ?? raw.en ?? raw.zh ?? Object.values(raw)[0] ?? fallback;
}

function transformCategory(raw: CategoryRaw): Category {
  return {
    id: raw.id,
    name: pickLocalized(raw.name),
    // Why: iconUrl 统一为图片 URL 契约（后端 W7-ext-H1 已清 emoji）
    // icon 字段废弃，统一走 image；空 URL -> undefined 走 fallback 'tag' 图标
    icon: '',
    image: raw.iconUrl || undefined,
    parentId: raw.parentId ?? undefined,
    // Why: P3 - 后端 listCategoryTree 返嵌套 children，递归映射（无 children 时为 undefined，前端隐藏子分类墙）
    children: raw.children?.map(transformCategory),
  };
}

function transformBanner(raw: BannerRaw): Banner {
  return {
    id: raw.id,
    image: raw.imageUrl,
    title: pickLocalized(raw.alt),
  };
}

export const catalogApi = {
  async getCategories(): Promise<Category[]> {
    if (isMockMode) return mockResponse(mockDb.categories);
    const res = await api.get<CategoryRaw[]>('/client/categories');
    return res.data.map(transformCategory);
  },

  async getBanners(): Promise<Banner[]> {
    if (isMockMode) return mockResponse(mockDb.banners);
    // Why: banners 是后端专属端点（onlyActive=true 已由后端 controller 处理）
    const res = await api.get<BannerRaw[]>('/client/banners');
    return res.data.map(transformBanner);
  },
};
