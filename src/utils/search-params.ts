import { NO_FILTERS, type SearchFilters } from '@/api/client';

/**
 * Bộ lọc của màn tìm kiếm qua tham số đường dẫn — để mở lại một lượt tìm đã lưu (từ danh sách hay từ thông báo) đúng như
 * lúc lưu. Tham số là chuỗi; rỗng hay số sai dạng coi như không lọc. `attrs` không đi qua đây: lượt tìm đã lưu không
 * mang mẫu.
 */
export type SearchParams = {
  q?: string;
  category?: string;
  province?: string;
  min?: string;
  max?: string;
};

const numberOf = (text: string | undefined): number | null => {
  const value = text ? Number(text) : Number.NaN;
  return Number.isInteger(value) ? value : null;
};

export function toSearchParams(f: SearchFilters): SearchParams {
  return {
    q: f.q,
    ...(f.categoryId !== null && { category: f.categoryId }),
    ...(f.provinceCode !== null && { province: String(f.provinceCode) }),
    ...(f.minPrice !== null && { min: String(f.minPrice) }),
    ...(f.maxPrice !== null && { max: String(f.maxPrice) }),
  };
}

export function filtersFromParams(p: SearchParams): SearchFilters {
  return {
    ...NO_FILTERS,
    q: p.q ?? '',
    categoryId: p.category || null,
    provinceCode: numberOf(p.province),
    minPrice: numberOf(p.min),
    maxPrice: numberOf(p.max),
  };
}
