import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notice } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Dữ liệu gắn với người đang đăng nhập: hồ sơ, thông báo, trợ giúp. */

export function useMe() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.me(), queryFn: mockApi.getMe, enabled: authed });
}

export function useNotices() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.notices(), queryFn: mockApi.getNotices, enabled: authed });
}

/** Chấm trên chuông — cùng key với danh sách thông báo. */
export function useHasUnreadNotices(): boolean {
  const { data } = useNotices();
  return data?.some((n) => !n.read) ?? false;
}

export function useMarkAllNoticesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mockApi.markAllNoticesRead,
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.notices() });
      const prev = qc.getQueryData<Notice[]>(qk.notices());
      qc.setQueryData<Notice[]>(qk.notices(), (list) => list?.map((n) => ({ ...n, read: true })));
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.notices(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notices() }),
  });
}

export function useHelpTopics() {
  return useQuery({ queryKey: qk.help(), queryFn: mockApi.getHelpTopics, staleTime: Infinity });
}
