import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type StaffScopeInput } from '@/api/ops';
import { qk } from './keys';

/*
 * Quyền staff (master). Gắn, sửa, thu, trả lại đều đổi danh sách và tình trạng của người đó — quét cả nhánh `staff`.
 * Thẻ tài khoản (tên) dùng chung key với hồ sơ người dùng, nên mở hồ sơ từ đây không tải lại.
 */

export function useOpsStaff(categoryId: string | null) {
  return useQuery({ queryKey: qk.ops.staff(categoryId), queryFn: () => opsApi.staff(categoryId) });
}

/** Server chỉ trả mã tài khoản; tên ghép từ thẻ tài khoản của từng người — staff thường chỉ vài người. */
export function useAccountNames(ids: readonly string[]): Map<string, string> {
  const cards = useQueries({
    queries: ids.map((id) => ({
      queryKey: qk.ops.account(id),
      queryFn: () => opsApi.account(id),
    })),
  });
  return new Map(
    cards.flatMap((c) => (c.data ? [[c.data.id, c.data.displayName] as [string, string]] : [])),
  );
}

function useStaffWrite<V>(write: (vars: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.staffAll() }),
  });
}

export const useSetStaff = (accountId: string) =>
  useStaffWrite((scope: StaffScopeInput) => opsApi.setStaff(accountId, scope));
export const useRevokeStaff = (accountId: string) =>
  useStaffWrite(() => opsApi.revokeStaff(accountId));
export const useRestoreStaff = (accountId: string) =>
  useStaffWrite(() => opsApi.restoreStaff(accountId));
