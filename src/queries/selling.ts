import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MyListing, type MyListingAction } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/* Phía người bán sau khi đăng: tin của tôi và hành động trên nó. Luồng soạn và gửi tin ở `./posting`. */

const notSold = (list: MyListing[]) => list.filter((l) => l.state !== 'sold');
const soldOnly = (list: MyListing[]) => list.filter((l) => l.state === 'sold');

/**
 * Máy duyệt thường trả lời trong vài giây sau khi gửi; thông báo realtime chưa nối, nên còn tin "đang kiểm"
 * thì hỏi lại theo nhịp này tới khi máy cho qua hay giữ lại.
 */
const CHECKING_POLL_MS = 4000;

/** Hai ngăn đọc chung một request: đổi ngăn hay đánh dấu đã bán không tải lại hai lần. */
export function useMyListings(shelf: 'active' | 'sold') {
  const authed = useIsAuthenticated();
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.listings.mine(),
    queryFn: () => api.getMyListings(lookupsFrom(qc)),
    enabled: authed,
    select: shelf === 'sold' ? soldOnly : notSold,
    refetchInterval: (q) =>
      q.state.data?.some((l) => l.state === 'checking') ? CHECKING_POLL_MS : false,
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
 * Mọi hành động đều đổi trạng thái tin, tin rời hay vào sàn (chuyển lên chợ chung tạo thêm một tin): đọc lại cả nhánh
 * tin, không vá cache từng danh sách.
 */
export function useMyListingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, item }: { action: MyListingAction; item: MyListing }) =>
      api.actOnMyListing(action, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.listings.all() }),
  });
}
