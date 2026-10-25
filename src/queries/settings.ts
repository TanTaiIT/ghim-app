import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Me, type NotificationPref, type PickedPhoto } from '@/api/client';
import { useAuthStore, useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Màn Cài đặt: ảnh đại diện, mật khẩu, email, thiết bị đăng nhập, người đã chặn, thông báo, xoá tài khoản. */

/** Server trả lại hồ sơ mới sau khi đổi ảnh — ghi thẳng vào cache thay vì tải lại. */
export function useSetAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photo: PickedPhoto | null) => {
      const me = qc.getQueryData<Me>(qk.me());
      if (photo === null) return api.clearAvatar();
      if (!me) throw new Error('Chưa tải xong hồ sơ, thử lại sau giây lát');
      return api.setAvatar(me.id, photo);
    },
    onSuccess: (me) => qc.setQueryData(qk.me(), me),
  });
}

/** Đổi mật khẩu đăng xuất mọi máy khác: danh sách thiết bị phải đọc lại. */
export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      api.changePassword(current, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions() }),
  });
}

export function useSessions() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.sessions(), queryFn: api.getSessions, enabled: authed });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | 'others') => api.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.sessions() }),
  });
}

export function useBlocks() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.blocks(), queryFn: api.getBlocks, enabled: authed });
}

/** Gỡ chặn mở lại hội thoại cũ với người đó — hội thoại đang chỉ để đọc phải đọc lại. */
export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => api.unblock(accountId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.blocks() });
      void qc.invalidateQueries({ queryKey: qk.conversations.all() });
    },
  });
}

/**
 * Server đã thu hồi mọi phiên, kể cả máy này: không gọi `logout` (sẽ 401), chỉ xoá phiên ở máy — `useAuthBridge` dọn
 * cache, `Stack.Protected` đưa người dùng ra khỏi các màn cần đăng nhập (HARD#18).
 */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => useAuthStore.getState().signOut(),
  });
}

/** Chặn từ hội thoại hay trang người bán: danh sách đã chặn đổi, hội thoại với người đó thành chỉ đọc. */
export function useBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId: string) => api.block(accountId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.blocks() });
      void qc.invalidateQueries({ queryKey: qk.conversations.all() });
    },
  });
}

export function useNotificationPrefs() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: qk.notificationPrefs(),
    queryFn: api.getNotificationPrefs,
    enabled: authed,
  });
}

/** Lạc quan: công tắc đổi ngay; server từ chối thì trả lại như cũ. */
export function useSetNotificationPref() {
  const qc = useQueryClient();
  const key = qk.notificationPrefs();
  return useMutation({
    mutationFn: ({ category, enabled }: NotificationPref) =>
      api.setNotificationPref(category, enabled),
    onMutate: async ({ category, enabled }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<NotificationPref[]>(key);
      qc.setQueryData<NotificationPref[]>(key, (list = []) =>
        list.map((p) => (p.category === category ? { category, enabled } : p)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMyReports() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.myReports(), queryFn: api.getMyReports, enabled: authed });
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.requestEmailChange(email, password),
  });
}

/** Xác nhận xong: hồ sơ mang email mới, các máy khác bị đăng xuất — danh sách thiết bị đọc lại. */
export function useConfirmEmailChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.confirmEmailChange(code),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.me() });
      void qc.invalidateQueries({ queryKey: qk.sessions() });
    },
  });
}
