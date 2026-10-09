import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, CategoryId, NewListing, Place } from '@/api/client';
import { ApiError } from '@/api/http';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import type { Draft } from '@/stores/draft';
import { qk } from './keys';

/* Phía người bán: dữ liệu cho luồng đăng tin, tin của tôi, đánh dấu đã bán. */

export function useCategories() {
  return useQuery({
    queryKey: qk.categories(),
    queryFn: mockApi.getCategories,
    staleTime: Infinity,
  });
}

export function useDistricts() {
  return useQuery({ queryKey: qk.districts(), queryFn: mockApi.getDistricts, staleTime: Infinity });
}

/** Gợi ý danh mục theo tiêu đề. Dưới 3 ký tự thì chưa đủ chữ để đoán — không gọi. */
export function useCategorySuggestion(title: string) {
  const t = title.trim();
  return useQuery({
    queryKey: qk.categorySuggestion(t),
    queryFn: () => mockApi.suggestCategory(t),
    enabled: t.length >= 3,
  });
}

export function usePriceHint(categoryId: CategoryId | null) {
  return useQuery({
    queryKey: qk.priceHint(categoryId ?? 'phone'),
    queryFn: () => mockApi.getPriceHint(categoryId ?? 'phone'),
    enabled: categoryId !== null,
  });
}

export function useSamplePhotos() {
  return useQuery({
    queryKey: qk.samplePhotos(),
    queryFn: mockApi.getSamplePhotos,
    staleTime: Infinity,
  });
}

export function useBoostPlans() {
  return useQuery({ queryKey: qk.boostPlans(), queryFn: mockApi.getBoostPlans });
}

export function useMyListings(state: 'active' | 'sold') {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.listings.mine(state),
    queryFn: () => mockApi.getMyListings(state),
    enabled: authed,
  });
}

export function useMarkSold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockApi.markSold(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.listings.all() });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

/**
 * Nháp (store) → payload. Danh mục tra lại trong danh sách thật thay vì tin chuỗi trong nháp: store là
 * lá nên giữ `categoryId` dạng chuỗi, còn payload cần đúng `CategoryId`.
 */
function toNewListing(d: Draft, categories: Category[], fallback: Place): NewListing {
  const category = categories.find((c) => c.id === d.categoryId);
  if (!category || !d.condition) {
    throw new ApiError('VALIDATION_ERROR', 'Chọn danh mục và tình trạng trước khi đăng', 400);
  }
  return {
    title: d.title.trim(),
    categoryId: category.id,
    condition: d.condition,
    price: d.price,
    allowOffers: d.allowOffers,
    specs: category.specKeys
      .map((label) => ({ label, value: (d.specs[label] ?? '').trim() }))
      .filter((s) => s.value !== ''),
    description: d.description.trim(),
    place: d.place ?? fallback,
    groupIds: d.groupIds,
    photos: d.photos,
    boostId: d.boostId,
  };
}

export function usePublishListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: Draft) => {
      const [categories, me] = await Promise.all([
        qc.ensureQueryData({ queryKey: qk.categories(), queryFn: mockApi.getCategories }),
        qc.ensureQueryData({ queryKey: qk.me(), queryFn: mockApi.getMe }),
      ]);
      return mockApi.publishListing(toNewListing(draft, categories, me.place));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.listings.all() });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}
