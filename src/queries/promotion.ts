import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionApi } from '@/api/promotion';
import { qk } from './keys';

/* Gói đẩy tin trả Xu của người đăng — xem `src/api/promotion.ts`. */

/** Chỉ hỏi khi bảng gói mở: mỗi lần mở đọc lại lý do mới nhất (số dư, thời gian chờ). */
export function useListingPromotions(listingId: string | null) {
  return useQuery({
    queryKey: qk.listings.promotions(listingId ?? ''),
    queryFn: () => promotionApi.forListing(listingId ?? ''),
    enabled: listingId !== null,
    staleTime: 0,
  });
}

/** Mua xong: bảng tin, tin của tôi, ví và chính bảng gói đọc lại. */
export function useBuyPromotion(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { productCode: string; idempotencyKey: string }) =>
      promotionApi.buy({ listingId, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.listings.all() });
      void qc.invalidateQueries({ queryKey: qk.wallet.all() });
      void qc.invalidateQueries({ queryKey: qk.groups.all() });
    },
  });
}
