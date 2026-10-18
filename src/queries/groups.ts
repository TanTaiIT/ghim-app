import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { lookupsFrom } from './catalog';
import { qk } from './keys';

/*
 * Mặt thành viên của nhóm: tìm, xem, vào (bấm vào / gửi đơn / mã / lời mời), rút đơn, rời, tắt tiếng. Mọi lượt
 * ghi invalidate `qk.groups.all()`: vào hay rời đổi cả hồ sơ, bảng tin ("chỉ thành viên"), thông báo nhóm và danh
 * sách "Nhóm của tôi" cùng lúc. Kết quả của lượt vào (vào ngay hay thành đơn) chỉ server biết, nên nút không đổi
 * lạc quan mà chờ server.
 */

export function useMyGroups() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.groups.mine(), queryFn: api.getMyGroups, enabled: authed });
}

/** Khách xem được nhóm công khai; nhóm riêng tư chỉ ra tên. */
export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: qk.groups.detail(id ?? ''),
    queryFn: () => api.getGroup(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useGroupListings(id: string, enabled: boolean) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.groups.listings(id),
    queryFn: () => api.getGroupListings(id, lookupsFrom(qc)),
    enabled,
  });
}

export function useGroupAnnouncements(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.groups.announcements(id),
    queryFn: () => api.getGroupAnnouncements(id),
    enabled,
  });
}

/** Chỉ hỏi khi người xem là chủ nhóm hay điều hành viên — server từ chối mọi người khác. */
export function useGroupMembers(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.groups.members(id),
    queryFn: () => api.getGroupMembers(id),
    enabled,
  });
}

export function useGroupInvites() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.groups.invites(), queryFn: api.getGroupInvites, enabled: authed });
}

export function useMutedGroups() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.groups.muted(),
    queryFn: api.getMutedGroupIds,
    enabled: authed,
    select: (ids) => new Set(ids),
  });
}

/** Dưới 2 ký tự thì gần như khớp mọi nhóm — chưa hỏi server. */
export function useGroupSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.groups.search(term),
    queryFn: () => api.searchGroups(term),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  });
}

/**
 * Mã đi theo lượt bấm "Tìm", không theo từng ký tự: mã gõ dở luôn sai. Không hỏi lại: mã sai là 404, hỏi lần
 * nữa không đổi kết quả mà người gõ phải chờ gấp đôi mới thấy báo sai.
 */
export function useGroupCode(code: string | null) {
  return useQuery({
    queryKey: qk.groups.code(code ?? ''),
    queryFn: () => api.lookupGroupCode(code ?? ''),
    enabled: code !== null,
    retry: false,
  });
}

function useGroupWrite<V, R>(write: (vars: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSettled: () => qc.invalidateQueries({ queryKey: qk.groups.all() }),
  });
}

export const useJoinGroup = (id: string) =>
  useGroupWrite((code: string | undefined) => api.joinGroup(id, code));

export const useWithdrawJoinRequest = (id: string) =>
  useGroupWrite(() => api.withdrawJoinRequest(id));

export const useLeaveGroup = (id: string) => useGroupWrite(() => api.leaveGroup(id));

export const useAnswerInvitation = () =>
  useGroupWrite(({ id, accept }: { id: string; accept: boolean }) =>
    api.answerInvitation(id, accept),
  );

/** Vào từ danh sách lớp ở "Nhóm của tôi": cùng lượt vào của trang nhóm, chỉ khác mã nhóm đi theo lượt gọi. */
export const useJoinFromRoster = () => useGroupWrite((id: string) => api.joinGroup(id));

/** Lạc quan: công tắc đổi ngay; server từ chối thì trả lại như cũ. */
export function useSetGroupMuted(id: string) {
  const qc = useQueryClient();
  const key = qk.groups.muted();
  return useMutation({
    mutationFn: (muted: boolean) => api.setGroupMuted(id, muted),
    onMutate: async (muted) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key, (ids = []) =>
        muted ? [...ids, id] : ids.filter((x) => x !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
