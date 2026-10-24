import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupManageApi, type GroupSettingsPatch } from '@/api/group-manage';
import { qk } from './keys';

/*
 * Quản trị nhóm (chủ nhóm, điều hành viên). Mọi lượt ghi invalidate `qk.groups.all()` như mặt thành viên: duyệt đơn đổi
 * số thành viên lẫn danh sách thành viên, đổi mã hay cài đặt đổi hồ sơ nhóm, thông báo mới vào bảng tin — cùng một cây
 * key, không có nhánh riêng để quét. Không đổi lạc quan: hai người có thể cùng xử một đơn, server mới biết lượt nào thắng.
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

export function useBans(groupId: string) {
  return useQuery({
    queryKey: qk.groups.bans(groupId),
    queryFn: () => groupManageApi.bans(groupId),
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

type Target = { accountId: string };
type TargetUnit = Target & { unitId: string | null };

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

export const useSetMemberUnit = (groupId: string) =>
  useManageWrite(({ accountId, unitId }: TargetUnit) =>
    groupManageApi.setMemberUnit(groupId, accountId, unitId),
  );

export const useRemoveMember = (groupId: string) =>
  useManageWrite(({ accountId }: Target) => groupManageApi.removeMember(groupId, accountId));

export const useBanMember = (groupId: string) =>
  useManageWrite(({ accountId }: Target) => groupManageApi.ban(groupId, accountId));

export const useUnban = (groupId: string) =>
  useManageWrite(({ accountId }: Target) => groupManageApi.unban(groupId, accountId));

export const useAddRoster = (groupId: string) =>
  useManageWrite((entries: { email: string; unitId: string | null }[]) =>
    groupManageApi.addRoster(groupId, entries),
  );

export const useRemoveRosterEntry = (groupId: string) =>
  useManageWrite((email: string) => groupManageApi.removeRosterEntry(groupId, email));

export const useUpdateGroupSettings = (groupId: string) =>
  useManageWrite((patch: GroupSettingsPatch) => groupManageApi.updateSettings(groupId, patch));

export const useCreateUnit = (groupId: string) =>
  useManageWrite((name: string) => groupManageApi.createUnit(groupId, name));

export const useRenameUnit = (groupId: string) =>
  useManageWrite(({ unitId, name }: { unitId: string; name: string }) =>
    groupManageApi.renameUnit(groupId, unitId, name),
  );

export const useDeleteUnit = (groupId: string) =>
  useManageWrite((unitId: string) => groupManageApi.deleteUnit(groupId, unitId));

export const useSetModerator = (groupId: string) =>
  useManageWrite(({ accountId, unitId }: TargetUnit) =>
    groupManageApi.setModerator(groupId, accountId, unitId),
  );

export const useDismissModerator = (groupId: string) =>
  useManageWrite(({ accountId }: Target) => groupManageApi.dismissModerator(groupId, accountId));

export const useTransferOwnership = (groupId: string) =>
  useManageWrite(({ accountId }: Target) => groupManageApi.transferOwnership(groupId, accountId));

export const useCancelOwnerTransfer = (groupId: string) =>
  useManageWrite(() => groupManageApi.cancelOwnerTransfer(groupId));

export const useCloseGroup = (groupId: string) =>
  useManageWrite(() => groupManageApi.closeGroup(groupId));

export const usePostAnnouncement = (groupId: string) =>
  useManageWrite(({ body, unitId }: { body: string; unitId: string | null }) =>
    groupManageApi.postAnnouncement(groupId, body, unitId),
  );
