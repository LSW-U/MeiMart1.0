import { api, isMockMode } from './api';
import { mockDb, mockResponse } from './mockDb';
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

// Why: 跨端基建统一 批1（A4 透传 + D9 删本地 pickLocalized）——多语 JSON 原样透传，
// 渲染层 localize()（@/i18n → @meimart/i18n-core）取值，切语言不再依赖 queryKey 重拉。
// mock 数据 name/title 是纯串（LocalizableText 兼容 string 直通语义）。

function transformCategory(raw: CategoryRaw): Category {
  return {
    id: raw.id,
    name: (raw.name ?? {}) as Category['name'],
    // Why: iconUrl 统一为图片 URL 契约（后端 W7-ext-H1 已清 emoji）
    // icon 字段废弃，统一走 image；空 URL -> undefined 走 fallback 'tag' 图标
    icon: '',
    image: raw.iconUrl || undefined,
    parentId: raw.parentId ?? undefined,
    // Why: P3 - 后端 listCategoryTree 返嵌套 children，递归映射（无 children 时为 undefined，前端隐藏子分类墙）
    children: raw.children?.map(transformCategory),
  };
}

// Why: 20261023 banner 观感修复（用户「不要红色」）——real 契约无 theme/cta 字段
//   （后端 Banner 表仅 imageUrl/alt/linkType/linkValue），原实现全部落 primary 红色路径。
//   UI 已改纯图片卡不再消费色底（BannerCarousel 20261023 定稿），theme 轮换仅作类型兼容
//   保留（mock 数据同字段，运营若日后要按卡配色可直接消费）；linkType/linkValue 映射成 link
//   （契约现成字段此前漏接，PRODUCT→/product/{id} 可跳详情；CATEGORY/URL/NONE 暂不导航）。
const BANNER_THEME_CYCLE: Banner['theme'][] = ['primary', 'emerald', 'blue'];

function transformBanner(raw: BannerRaw, index: number): Banner {
  const link =
    raw.linkType === 'PRODUCT' && raw.linkValue
      ? `/product/${raw.linkValue}`
      : raw.linkType === 'URL' && raw.linkValue
        ? raw.linkValue
        : undefined;
  return {
    id: raw.id,
    image: raw.imageUrl,
    title: (raw.alt ?? {}) as Banner['title'],
    theme: BANNER_THEME_CYCLE[index % BANNER_THEME_CYCLE.length],
    link,
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
    return res.data.map((raw, i) => transformBanner(raw, i));
  },
};
