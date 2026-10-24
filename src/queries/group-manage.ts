import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupManageApi } from '@/api/group-manage';
import { qk } from './keys';

/*
 * Quản trị nhóm (chủ nhóm, điều hành viên). Mọi lượt ghi invalidate `qk.groups.all()` như mặt thành viên: duyệt đơn đổi
 * số thành viên lẫn danh sách thành viên, đổi mã đổi hồ sơ nhóm — cùng một cây key, không có nhánh riêng để quét.
 * Không đổi lạc quan: hai người có thể cùng xử một đơn, server mới biết lượt nào thắng.
 */

/** Chỉ hỏi khi người xem duyệt được đơn (chủ nhóm, điều hành viên cả nhóm) — server trả 403 cho mọi người khác. */
export function useJoinRequests(groupId: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.groups.joinRequests(groupId),
    queryFn: () => groupManageApi.joinRequests(groupId),
    enabled: enabled && Boolean(groupId),
  });
}

export function usePendingInvitations(groupId: string) {
  return useQuery({
    queryKey: qk.groups.pendingInvitations(groupId),
    queryFn: () => groupManageApi.invitations(groupId),
    enabled: Boolean(groupId),
  });
}

function useManageWrite<V, R>(write: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSettled: () => qc.invalidateQueries({ queryKey: qk.groups.all() }),
  });
}

export const useDecideJoinRequest = () =>
  useManageWrite(({ id, approve }: { id: string; approve: boolean }) =>
    groupManageApi.decideJoinRequest(id, approve),
  );

export const useInvite = (groupId: string) =>
  useManageWrite(({ email, unitId }: { email: string; unitId: string | null }) =>
    groupManageApi.invite(groupId, email, unitId),
  );

export const useRevokeInvitation = (groupId: string) =>
  useManageWrite((invitationId: string) => groupManageApi.revokeInvitation(groupId, invitationId));

export const useRotateGroupCode = (groupId: string) =>
  useManageWrite(() => groupManageApi.rotateCode(groupId));
