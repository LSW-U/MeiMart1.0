export type Locale = 'en' | 'tet' | 'pt' | 'id';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
