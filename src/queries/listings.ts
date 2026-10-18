import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, NO_FILTERS, type ListingCard, type SearchFilters } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/* Phía người xem: bảng tin, tìm kiếm, chi tiết, tin đã lưu. Phía người bán nằm ở `./selling`. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tin trong nhóm, tin đã lưu, tin trong chat vẫn là dữ liệu mẫu (id dạng `l-…`) và vẫn mở màn
 * chi tiết — id không phải uuid thì đọc từ mock. Xoá nhánh này khi các domain đó nối backend.
 */
const fromServer = (id: string) => UUID.test(id);

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

export function useListing(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.detail(id ?? ''),
    queryFn: () => {
      const key = id ?? '';
      return fromServer(key) ? api.getListing(key, lookupsFrom(qc)) : mockApi.getListing(key);
    },
    enabled: Boolean(id),
  });
}

export function useSimilar(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.similar(id ?? ''),
    queryFn: () => {
      const key = id ?? '';
      return fromServer(key) ? api.getSimilar(key, lookupsFrom(qc)) : mockApi.getSimilar(key);
    },
    enabled: Boolean(id),
  });
}

/** Tập id tin đã lưu — trái tim trên mọi thẻ đọc chung một key, lưu ở đâu cũng đổi ở mọi nơi. */
export function useSavedIds() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.savedIds(),
    queryFn: mockApi.getSavedIds,
    enabled: authed,
    select: (ids) => new Set(ids),
  });
}

/** Lạc quan: trái tim đổi ngay khi bấm, vì chờ mạng cho một cú chạm là cảm giác app bị đơ. */
export function useToggleSaved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) => mockApi.setSaved(id, saved),
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
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.listings.saved(),
    queryFn: mockApi.getSavedListings,
    enabled: authed,
  });
}

export function useSavedSearches() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.savedSearches(),
    queryFn: mockApi.getSavedSearches,
    enabled: authed,
  });
}

export function useSaveSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: string) => mockApi.saveSearch(q),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.savedSearches() }),
  });
}

export function useReportListing() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      mockApi.reportListing(id, reason),
  });
}
