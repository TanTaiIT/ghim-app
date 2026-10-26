import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type IdDocumentType, type Notice } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Dữ liệu gắn với người đang đăng nhập: hồ sơ, thông báo, trợ giúp, xác minh giấy tờ. */

export function useMe() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.me(), queryFn: api.getMe, enabled: authed });
}

/**
 * Hồ sơ đọc lại mỗi lần màn mở, dù cache còn mới: cổng bàn vận hành hỏi "còn quyền không", mà master có thể vừa gắn hay
 * thu quyền staff — đọc bản cache 30 giây là cho vào nhầm hay chặn nhầm.
 */
export function useFreshMe() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.me(),
    queryFn: api.getMe,
    enabled: authed,
    refetchOnMount: 'always',
  });
}

/** Công tắc trạng thái hoạt động: server trả lại hồ sơ mới, ghi thẳng vào cache thay vì tải lại. */
export function useSetHomeProvince() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: number | null) => api.setHomeProvince(code),
    onSuccess: (me) => qc.setQueryData(qk.me(), me),
  });
}

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
  return useQuery({ queryKey: qk.help(), queryFn: api.getHelpTopics });
}

/** Trang Cá nhân cũng đọc hook này, mà khách vẫn mở được trang đó — không có phiên thì không hỏi. */
export function useMyIdVerification() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.idVerification(),
    queryFn: api.getMyIdVerification,
    enabled: authed,
  });
}

/** Hồ sơ vừa nộp là hồ sơ gần nhất — ghi thẳng vào cache, màn xác minh chuyển sang "chờ duyệt" không cần tải lại. */
export function useSubmitIdVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      documentType: IdDocumentType;
      documentNumber: string;
      fullName: string;
    }) => api.submitIdVerification(input),
    onSuccess: (submission) => qc.setQueryData(qk.idVerification(), submission),
  });
}
