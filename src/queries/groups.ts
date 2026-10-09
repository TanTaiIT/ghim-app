import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Group } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

export function useMyGroups() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.groups.mine(), queryFn: mockApi.getMyGroups, enabled: authed });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: qk.groups.detail(id ?? ''),
    queryFn: () => mockApi.getGroup(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useGroupListings(id: string | undefined) {
  return useQuery({
    queryKey: qk.groups.listings(id ?? ''),
    queryFn: () => mockApi.getGroupListings(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useGroupMembers(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.groups.members(id ?? ''),
    queryFn: () => mockApi.getGroupMembers(id ?? ''),
    // Tab "Thành viên" mới cần: không tải danh sách khi người xem chưa mở tab.
    enabled: Boolean(id) && enabled,
  });
}

/** Lạc quan: nút Tham gia đổi ngay, kèm số thành viên, để không ai bấm hai lần vì tưởng chưa ăn. */
export function useSetGroupJoined(id: string) {
  const qc = useQueryClient();
  const key = qk.groups.detail(id);
  return useMutation({
    mutationFn: (joined: boolean) => mockApi.setGroupJoined(id, joined),
    onMutate: async (joined) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Group>(key);
      qc.setQueryData<Group>(
        key,
        (g) => g && { ...g, joined, memberCount: g.memberCount + (joined ? 1 : -1) },
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.groups.all() });
      void qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}
