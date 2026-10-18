import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Notice } from '@/api/client';
import { mockApi } from '@/api/mock';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Dữ liệu gắn với người đang đăng nhập: hồ sơ, thông báo, trợ giúp. Trợ giúp vẫn là dữ liệu mẫu. */

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

/* Tin mới tới qua realtime (`queries/realtime.ts`): `notification:new` / `updated` invalidate danh sách,
 * `notification:unread` ghi thẳng số chưa đọc — số đó đổi cả khi đọc trên máy khác. */

export function useNotices() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.notices.list(), queryFn: api.getNotices, enabled: authed });
}

/** Chấm trên chuông: hỏi riêng số chưa đọc thay vì tải cả hộp thư ở mọi màn có chuông. */
export function useHasUnreadNotices(): boolean {
  const authed = useIsAuthenticated();
  const { data } = useQuery({
    queryKey: qk.notices.unread(),
    queryFn: api.unreadNoticeCount,
    enabled: authed,
  });
  return (data ?? 0) > 0;
}

/** Lạc quan: các dòng sáng lên ngay; server từ chối thì trả lại như cũ. */
export function useMarkNoticesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') => api.markNoticesRead(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: qk.notices.all() });
      const prev = qc.getQueryData<Notice[]>(qk.notices.list());
      qc.setQueryData<Notice[]>(qk.notices.list(), (list) =>
        list?.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.notices.list(), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notices.all() }),
  });
}

export function useHelpTopics() {
  return useQuery({ queryKey: qk.help(), queryFn: mockApi.getHelpTopics, staleTime: Infinity });
}
