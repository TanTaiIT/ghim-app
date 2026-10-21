import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi } from '@/api/ops';
import { qk } from './keys';

/*
 * Hỗ trợ người dùng (staff có quyền `support`, master). Hàng chung của cả đội, chờ lâu nhất trước. Không có realtime
 * cho bàn vận hành, nên hàng chờ và khung đang mở tự tải lại — tin của người dùng tới mà không ai kéo xuống thì
 * không ai thấy.
 */
const QUEUE_REFRESH_MS = 60_000;
const THREAD_REFRESH_MS = 15_000;

export function useSupportQueue(pendingOnly: boolean) {
  return useQuery({
    queryKey: qk.ops.support(pendingOnly),
    queryFn: () => opsApi.supportQueue(pendingOnly),
    placeholderData: keepPreviousData,
    refetchInterval: QUEUE_REFRESH_MS,
  });
}

export function useSupportThread(id: string) {
  return useQuery({
    queryKey: qk.ops.thread(id),
    queryFn: () => opsApi.supportThread(id),
    enabled: Boolean(id),
    refetchInterval: THREAD_REFRESH_MS,
  });
}

/** Trả lời xong thì hội thoại rời hàng "đang chờ đội" — hàng chờ đổi theo, không chỉ khung chat. */
export function useSendSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: string; body: string }) => opsApi.sendSupport(d),
    onSuccess: (_r, { id }) => {
      void qc.invalidateQueries({ queryKey: qk.ops.thread(id) });
      void qc.invalidateQueries({ queryKey: qk.ops.supportAll() });
    },
  });
}

/** Đã đọc cho cả đội: số chưa đọc trên hàng chờ về 0. */
export function useMarkSupportRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => opsApi.markSupportRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.supportAll() }),
  });
}
