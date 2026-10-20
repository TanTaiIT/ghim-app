import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Me, type PickedPhoto } from '@/api/client';
import { useAuthStore, useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Màn Cài đặt: ảnh đại diện, mật khẩu, thiết bị đăng nhập, người đã chặn, xoá tài khoản. */

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
