import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type NewGroup, type OpsGroupState } from '@/api/ops';
import { qk } from './keys';

/* Nhóm trên bàn vận hành — mọi route ở đây chỉ master gọi được. */

export function useOpsGroups(state: OpsGroupState | null) {
  return useQuery({
    queryKey: qk.ops.groups(state),
    queryFn: () => opsApi.groups(state),
    placeholderData: keepPreviousData,
  });
}

export function useOpsGroup(id: string) {
  return useQuery({
    queryKey: qk.ops.group(id),
    queryFn: () => opsApi.group(id),
    enabled: Boolean(id),
  });
}

/** Mọi thao tác đổi trạng thái nhóm: nhóm chuyển giữa các bộ lọc trạng thái, nên quét danh sách lẫn hồ sơ. */
function useGroupMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.ops.groupsAll() });
    },
  });
}

export const useCreateOpsGroup = () => useGroupMutation((g: NewGroup) => opsApi.createGroup(g));
export const useLockOpsGroup = () =>
  useGroupMutation((d: { id: string; reason: string }) => opsApi.lockGroup(d));
export const useUnlockOpsGroup = () => useGroupMutation((id: string) => opsApi.unlockGroup(id));
export const useCloseOpsGroup = () => useGroupMutation((id: string) => opsApi.closeGroup(id));
export const useOfferGroupOwner = () =>
  useGroupMutation((d: { id: string; accountId: string }) => opsApi.offerGroupOwner(d));
