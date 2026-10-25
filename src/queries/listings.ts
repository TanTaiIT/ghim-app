import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  NO_FILTERS,
  staleFilterField,
  type ListingCard,
  type ReportCategory,
  type SearchFilters,
} from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/* Phía người xem: bảng tin, tìm kiếm, chi tiết, tin đã lưu. Phía người bán nằm ở `./selling`. */

/**
 * Trang chủ đọc chung request của màn tìm kiếm không bộ lọc: bấm "Xem tất cả" mở ra đúng các tin vừa thấy,
 * không tải lại. Chưa biết khu vực của người dùng (`/me` chưa có) nên "Gần bạn" là toàn sàn.
 */
function useFeed<T>(select: (cards: ListingCard[]) => T) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.search(NO_FILTERS),
    queryFn: () => api.searchListings(NO_FILTERS, lookupsFrom(qc)),
    select,
  });
}

const everything = (cards: ListingCard[]) => cards;
const boostedOnly = (cards: ListingCard[]) => cards.filter((c) => c.boosted);

export const useNearby = () => useFeed(everything);

/** Tin còn hạn "nổi bật" — server mới có chỗ (`featuredUntil`), gói đẩy tin chưa có nên hiện đang rỗng. */
export const useFeatured = () => useFeed(boostedOnly);

/**
 * Không có `enabled`: bộ lọc rỗng là một truy vấn hợp lệ (xem mọi tin), không phải tham số thiếu.
 * `keepPreviousData` giữ lưới kết quả cũ khi đổi bộ lọc — lưới trống nháy lên rồi đầy lại trông như lỗi.
 */
export function useSearch(filters: SearchFilters) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.search(filters),
    queryFn: () => api.searchListings(filters, lookupsFrom(qc)),
    placeholderData: keepPreviousData,
  });
}

/**
 * Mẫu đổi giữa hai lượt tìm: server trả 400 nêu mục không còn nhận (design add-listing-filters, Risks) — bỏ mục đó
 * khỏi bộ lọc, đọc lại mẫu cho bảng "Thông tin" khớp bản mới, và báo câu của server. Có mục để bỏ mới làm, nên lượt
 * tìm kế tiếp cùng lỗi không lặp.
 */
export function useDropStaleFilter(
  error: unknown,
  filters: SearchFilters,
  onChange: (next: SearchFilters) => void,
  onDropped: (message: string) => void,
): void {
  const qc = useQueryClient();
  const stale = staleFilterField(error);
  useEffect(() => {
    if (stale === null || !(stale.field in filters.attrs)) return;
    const attrs = Object.fromEntries(
      Object.entries(filters.attrs).filter(([name]) => name !== stale.field),
    );
    onChange({ ...filters, attrs });
    if (filters.categoryId !== null) {
      void qc.invalidateQueries({ queryKey: qk.template(filters.categoryId) });
    }
    onDropped(stale.message);
  }, [stale, filters, onChange, onDropped, qc]);
}

export function useListing(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.detail(id ?? ''),
    queryFn: () => api.getListing(id ?? '', lookupsFrom(qc)),
    enabled: Boolean(id),
  });
}

export function useSimilar(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.similar(id ?? ''),
    queryFn: () => api.getSimilar(id ?? '', lookupsFrom(qc)),
    enabled: Boolean(id),
  });
}

export function useSeller(id: string | undefined) {
  return useQuery({
    queryKey: qk.seller(id ?? ''),
    queryFn: () => api.getSeller(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useSellerListings(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.bySeller(id ?? ''),
    queryFn: () => api.getSellerListings(id ?? '', lookupsFrom(qc)),
    enabled: Boolean(id),
  });
}

/** Tập id tin đã lưu — trái tim trên mọi thẻ đọc chung một key, lưu ở đâu cũng đổi ở mọi nơi. */
export function useSavedIds() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.savedIds(),
    queryFn: api.getSavedIds,
    enabled: authed,
    select: (ids) => new Set(ids),
  });
}

/** Lạc quan: trái tim đổi ngay khi bấm, vì chờ mạng cho một cú chạm là cảm giác app bị đơ. */
export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => api.setSaved(id, saved),
    onMutate: async ({ id, saved }) => {
      await qc.cancelQueries({ queryKey: qk.savedIds() });
      const prev = qc.getQueryData<string[]>(qk.savedIds());
      qc.setQueryData<string[]>(qk.savedIds(), (ids = []) =>
        saved ? [...ids, id] : ids.filter((x) => x !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.savedIds(), ctx?.prev),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.savedIds() });
      void qc.invalidateQueries({ queryKey: qk.listings.saved() });
    },
  });
}

export function useSavedListings() {
  const qc = useQueryClient();
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.listings.saved(),
    queryFn: () => api.getSavedListings(lookupsFrom(qc)),
    enabled: authed,
  });
}

export function useSavedSearches() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.savedSearches(),
    queryFn: api.getSavedSearches,
    enabled: authed,
  });
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filters: SearchFilters) => api.saveSearch(filters),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.savedSearches() }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSavedSearch(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.savedSearches() }),
  });
}

export function useReportListing() {
  return useMutation({
    mutationFn: ({ id, category }: { id: string; category: ReportCategory }) =>
      api.reportListing(id, category),
  });
}
