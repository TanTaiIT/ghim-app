import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type IdCheck } from '@/api/ops';
import { qk } from './keys';

/* Người dùng trên bàn vận hành: xác minh giấy tờ, lịch sử gậy, khoá / mở khoá. */

export function useIdChecks(status: IdCheck['status'] | null) {
  return useQuery({
    queryKey: qk.ops.idChecks(status),
    queryFn: () => opsApi.idChecks(status),
    placeholderData: keepPreviousData,
  });
}

/** Hồ sơ vừa quyết rời hàng "chờ" và vào hàng đã duyệt / từ chối: quét cả nhóm thay vì chuyển tay giữa các trang. */
export function useDecideIdCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: string; approve: boolean; reason?: string }) => opsApi.decideIdCheck(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.idChecksAll() }),
  });
}

export function useAccountStrikes(accountId: string) {
  return useQuery({
    queryKey: qk.ops.strikes(accountId),
    queryFn: () => opsApi.strikes(accountId),
    enabled: Boolean(accountId),
  });
}

/**
 * Khoá, mở khoá (master). Server không có endpoint đọc trạng thái khoá của một người, nên không có cache nào để vá:
 * màn hình tự nhớ kết quả lượt bấm của mình.
 */
export function useLockAccount() {
  return useMutation({ mutationFn: (d: { id: string; reason: string }) => opsApi.lockAccount(d) });
}

export function useUnlockAccount() {
  return useMutation({ mutationFn: (id: string) => opsApi.unlockAccount(id) });
}
