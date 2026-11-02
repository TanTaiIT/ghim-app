import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/* "Gợi ý cho bạn" (ghim-server add-home-suggestions): mục của trang chủ cùng công tắc và lịch sử ở Cài đặt. */

const FIRST_PAGE: string | null = null;

/**
 * "Xem thêm" tải trang kế. Gợi ý khác nhau theo người nhưng key không mang người: đăng xuất dọn cache, đăng nhập đọc
 * lại mọi query (`useAuthBridge`).
 */
export function useSuggestions(provinceCode: number | null) {
  const qc = useQueryClient();
  return useInfiniteQuery({
    queryKey: qk.listings.suggestions(provinceCode),
    queryFn: ({ pageParam }) => api.getSuggestions(provinceCode, pageParam, lookupsFrom(qc)),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => last.nextCursor,
  });
}

/** Đổi công tắc là đổi nhánh của mục gợi ý (theo hồ sơ ↔ được quan tâm nhiều) — đọc lại ngay, không chờ hết hạn. */
export function useSetPersonalizedSuggestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: boolean) => api.setPersonalizedSuggestions(value),
    onSuccess: (me) => {
      qc.setQueryData(qk.me(), me);
      void qc.invalidateQueries({ queryKey: qk.listings.suggestionsAll() });
    },
  });
}

export function useClearActivityHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.clearActivityHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.suggestionsAll() }),
  });
}
