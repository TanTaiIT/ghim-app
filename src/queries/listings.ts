import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SearchFilters } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Phía người xem: bảng tin, tìm kiếm, chi tiết, tin đã lưu. Phía người bán nằm ở `./selling`. */

export function useFeatured() {
  return useQuery({ queryKey: qk.listings.featured(), queryFn: mockApi.getFeatured });
}

export function useNearby() {
  return useQuery({ queryKey: qk.listings.nearby(), queryFn: mockApi.getNearby });
}

/**
 * Không có `enabled`: bộ lọc rỗng là một truy vấn hợp lệ (xem mọi tin), không phải tham số thiếu.
 * `keepPreviousData` giữ lưới kết quả cũ khi đổi bộ lọc — lưới trống nháy lên rồi đầy lại trông như lỗi.
 */
export function useSearch(filters: SearchFilters) {
  return useQuery({
    queryKey: qk.listings.search(filters),
    queryFn: () => mockApi.search(filters),
    placeholderData: keepPreviousData,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: qk.listings.detail(id ?? ''),
    queryFn: () => mockApi.getListing(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useSimilar(id: string | undefined) {
  return useQuery({
    queryKey: qk.listings.similar(id ?? ''),
    queryFn: () => mockApi.getSimilar(id ?? ''),
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
      void qc.invalidateQueries({ queryKey: qk.me() });
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
