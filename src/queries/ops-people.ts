import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type IdCheck, type OpsAccountStatus } from '@/api/ops';
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
/** Danh bạ (`/ops/accounts`): tìm theo tên hay email, lọc trạng thái, theo trang; giữ trang cũ khi đổi tham số. */
export function useAccountSearch(q: string, status: OpsAccountStatus | null, page: number) {
  return useQuery({
    queryKey: qk.ops.accounts(q, status, page),
    queryFn: () => opsApi.accounts(q, status, page),
    placeholderData: keepPreviousData,
  });
}

export function useOpsAccount(id: string) {
  return useQuery({
    queryKey: qk.ops.account(id),
    queryFn: () => opsApi.account(id),
    enabled: id !== '',
  });
}

/** Khoá / mở khoá đổi trạng thái tài khoản: danh bạ và thẻ đọc lại, nút trên trang hồ sơ đổi theo. */
export function useLockAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id: string; reason: string }) => opsApi.lockAccount(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.accountsAll() }),
  });
}

export function useUnlockAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => opsApi.unlockAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.accountsAll() }),
  });
}
