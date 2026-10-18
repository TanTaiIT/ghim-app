import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api, type LoadLookups, type Lookups } from '@/api/client';
import { qk } from './keys';

/*
 * Dữ liệu tham chiếu của server: danh mục, tỉnh/thành, phường/xã. Đổi rất hiếm nên không tự refetch
 * (`staleTime: Infinity`); danh sách phường tải theo tỉnh vì cả nước có hàng nghìn phường.
 */

const categories = { queryKey: qk.categories(), queryFn: api.getCategories, staleTime: Infinity };
const provinces = { queryKey: qk.provinces(), queryFn: api.getProvinces, staleTime: Infinity };
const wards = (code: number) => ({
  queryKey: qk.wards(code),
  queryFn: () => api.getWards(code),
  staleTime: Infinity,
});

export function useCategories() {
  return useQuery(categories);
}

export function useProvinces() {
  return useQuery(provinces);
}

export function useWards(provinceCode: number | null) {
  return useQuery({ ...wards(provinceCode ?? 0), enabled: provinceCode !== null });
}

/** Mẫu hiện hành của danh mục — master phát hành bản mới thì lượt mở sau đọc bản mới, nên không giữ mãi. */
export function useCategoryTemplate(categoryId: string | null) {
  return useQuery({
    queryKey: qk.template(categoryId ?? ''),
    queryFn: () => api.getTemplate(categoryId ?? ''),
    enabled: categoryId !== null,
  });
}

/**
 * Bộ tra tên cho `api.*Listings` — đọc qua cache: lần đầu tải danh mục, tỉnh và phường của các tỉnh có trên
 * trang, các lần sau không gọi mạng. Tỉnh/phường không có trong bảng (mã cũ, dữ liệu lỗi) thì để trống.
 */
export async function loadLookups(qc: QueryClient, provinceCodes: number[]): Promise<Lookups> {
  const [cats, provs, wardLists] = await Promise.all([
    qc.ensureQueryData(categories),
    qc.ensureQueryData(provinces),
    Promise.all(provinceCodes.map((code) => qc.ensureQueryData(wards(code)))),
  ]);
  const provinceName = new Map(provs.map((p) => [p.code, p.name]));
  const wardName = new Map(wardLists.flat().map((w) => [w.code, w.name]));
  return {
    category: (id) => cats.find((c) => c.id === id) ?? null,
    place: (provinceCode, wardCode) => ({
      province: (provinceCode !== null ? provinceName.get(provinceCode) : undefined) ?? '',
      ward: (wardCode !== null ? wardName.get(wardCode) : undefined) ?? null,
    }),
  };
}

/** Dạng mà `api.*Listings` nhận. */
export const lookupsFrom =
  (qc: QueryClient): LoadLookups =>
  (codes) =>
    loadLookups(qc, codes);
