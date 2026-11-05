// 收藏页共享（业务增强批3 拆分：从 app/favorites.tsx 原样搬移，行为零变更）

// Why: 视图偏好持久化（P19 D2），键名对齐现有 meimart.recentSearches / meimart.locale 风格
export const VIEW_STORAGE_KEY = 'meimart.favorites.view';
export type FavoritesView = 'grid' | 'list';
