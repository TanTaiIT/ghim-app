import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Notice } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Dữ liệu gắn với người đang đăng nhập: hồ sơ, thông báo, trợ giúp. Thông báo và trợ giúp vẫn là dữ liệu mẫu. */

export function useMe() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.me(), queryFn: api.getMe, enabled: authed });
}

/** Công tắc trạng thái hoạt động: server trả lại hồ sơ mới, ghi thẳng vào cache thay vì tải lại. */
export function useSetShowActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: boolean) => api.setShowActivity(value),
    onSuccess: (me) => {
      qc.setQueryData(qk.me(), me);
      void qc.invalidateQueries({ queryKey: qk.conversations.all() });
    },
  });
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
