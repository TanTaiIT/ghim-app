import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type MyListing,
  type NewListing,
  type Place,
  type PostCategory,
  type PostCategoryId,
} from '@/api/client';
import { ApiError } from '@/api/http';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import type { Draft } from '@/stores/draft';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/*
 * Phía người bán: dữ liệu cho luồng đăng tin, tin của tôi, đánh dấu đã bán. "Tin của tôi" và "Đã bán" là thật;
 * luồng đăng tin vẫn chạy trên dữ liệu mẫu — danh mục, khu vực, gợi ý giá của nó là của mock, tách khỏi danh
 * mục thật của phía xem (`./catalog`) để nháp không lẫn uuid của server với slug của mock.
 */

export function usePostCategories() {
  return useQuery({
    queryKey: qk.postCategories(),
    queryFn: mockApi.getPostCategories,
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

export function usePriceHint(categoryId: PostCategoryId | null) {
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

const notSold = (list: MyListing[]) => list.filter((l) => l.state !== 'sold');
const soldOnly = (list: MyListing[]) => list.filter((l) => l.state === 'sold');

/** Hai ngăn đọc chung một request: đổi ngăn hay đánh dấu đã bán không tải lại hai lần. */
export function useMyListings(shelf: 'active' | 'sold') {
  const authed = useIsAuthenticated();
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.mine(),
    queryFn: () => api.getMyListings(lookupsFrom(qc)),
    enabled: authed,
    select: shelf === 'sold' ? soldOnly : notSold,
  });
}

/** Tin rời sàn khi đã bán: bảng tin, kết quả tìm kiếm và màn chi tiết đều phải đọc lại. */
export function useMarkSold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markSold,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.all() }),
  });
}

/**
 * Nháp (store) → payload. Danh mục tra lại trong danh sách thật thay vì tin chuỗi trong nháp: store là
 * lá nên giữ `categoryId` dạng chuỗi, còn payload cần đúng `PostCategoryId`.
 */
function toNewListing(d: Draft, categories: PostCategory[], fallback: Place | null): NewListing {
  const category = categories.find((c) => c.id === d.categoryId);
  if (!category || !d.condition) {
    throw new ApiError('VALIDATION_ERROR', 'Chọn danh mục và tình trạng trước khi đăng', 400);
  }
  const place = d.place ?? fallback;
  if (!place) throw new ApiError('VALIDATION_ERROR', 'Chọn khu vực trước khi đăng', 400);
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
    place,
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
        qc.ensureQueryData({ queryKey: qk.postCategories(), queryFn: mockApi.getPostCategories }),
        qc.ensureQueryData({ queryKey: qk.me(), queryFn: api.getMe }),
      ]);
      return mockApi.publishListing(toNewListing(draft, categories, me.place));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.all() }),
  });
}
