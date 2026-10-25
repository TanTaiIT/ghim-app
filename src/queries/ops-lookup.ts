import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi } from '@/api/ops';
import { qk } from './keys';

/*
 * Tra mã tra cứu (master, staff có việc hỗ trợ). Một mã là của một lần máy giữ (tiền tố S) HOẶC của một đánh dấu thiết
 * bị; màn tra hỏi cả hai và hiện bên nào có, để không phụ thuộc định dạng mã của server. Không hỏi lại: mã sai là 404,
 * hỏi lần nữa không đổi kết quả.
 */

export function useHoldLookup(code: string | null) {
  return useQuery({
    queryKey: qk.ops.holdLookup(code ?? ''),
    queryFn: () => opsApi.holdLookup(code ?? ''),
    enabled: code !== null,
    retry: false,
  });
}

export function useFlagLookup(code: string | null) {
  return useQuery({
    queryKey: qk.ops.flag(code ?? ''),
    queryFn: () => opsApi.flag(code ?? ''),
    enabled: code !== null,
    retry: false,
  });
}

/** Gỡ đánh dấu đổi cả đánh dấu lẫn danh sách đánh dấu đang mở trong kết quả lần giữ — quét cả nhánh tra mã. */
export function useClearFlag(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => opsApi.clearFlag(code, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.lookupAll() }),
  });
}
