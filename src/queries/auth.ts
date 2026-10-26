import { useEffect } from 'react';
import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, type Registration } from '@/api/client';
import { ApiError, setHttpAccessToken, setHttpDeviceId, setSessionRefresher } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { qk } from './keys';

/**
 * Lượt làm mới phiên mà `http.ts` gọi khi một request có Bearer nhận 401.
 *
 * Server trả 401/403 cho lượt này nghĩa là phiên đã chết (bị thu hồi, hết hạn vì lâu không dùng, tài khoản
 * khoá) — xoá phiên trên máy để `Stack.Protected` đưa về màn khách, rồi ném tiếp để request gốc hiện đúng câu
 * của server ("phiên đã hết hạn, đăng nhập lại"). Lỗi khác (mạng, 409 do lượt khác của máy này) giữ phiên.
 */
async function refreshSession(): Promise<string | null> {
  const { session, signIn, signOut } = useAuthStore.getState();
  if (!session) return null;
  try {
    const next = await api.refresh(session.refreshToken);
    signIn(next);
    return next.accessToken;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) signOut();
    throw e;
  }
}

/**
 * Cầu nối store ↔ tầng HTTP: `src/api/**` không được import `stores/**` (folder.convention §6). Gọi MỘT lần ở
 * `app/_layout.tsx`, trước khi màn con nào gọi query; layout nằm ngoài `QueryClientProvider` nên `qc` đi qua
 * tham số.
 *
 * Đăng ký bằng `subscribe` chứ không đọc qua render: token đổi lúc đăng nhập / refresh phải tới tầng HTTP ngay
 * trong cùng tick, không đợi lượt render kế tiếp của layout. Phiên kết thúc — tự đăng xuất hay bị server thu
 * hồi giữa chừng — thì dọn cache ở đây, một chỗ cho cả hai đường: thiếu bước này người đăng nhập kế tiếp thấy
 * dữ liệu của phiên trước cho tới lần refetch đầu tiên. Khách vừa đăng nhập thì đọc lại mọi thứ: hồ sơ nhóm, tin
 * "chỉ thành viên" trả khác nhau theo người xem, bản của khách còn trong cache là sai.
 */
export function useAuthBridge(qc: QueryClient): void {
  useEffect(() => {
    const now = useAuthStore.getState();
    setHttpAccessToken(now.session?.accessToken ?? null);
    setHttpDeviceId(now.deviceId);
    setSessionRefresher(refreshSession);
    const unsubscribe = useAuthStore.subscribe((s, prev) => {
      setHttpAccessToken(s.session?.accessToken ?? null);
      setHttpDeviceId(s.deviceId);
      if (prev.session && !s.session) qc.clear();
      if (!prev.session && s.session) void qc.invalidateQueries();
    });
    return () => {
      unsubscribe();
      setSessionRefresher(null);
    };
  }, [qc]);
}

/** Đăng nhập. Không điều hướng sau khi `signIn` (HARD#18): `Stack.Protected` gỡ màn login khỏi stack. */
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email.trim(), password),
    onSuccess: (session) => useAuthStore.getState().signIn(session),
  });
}

/* Đăng ký và quên mật khẩu không mở phiên: route gọi `useLogin` sau bước cuối, bằng mật khẩu người dùng vừa gõ. */

export function useRegister() {
  return useMutation({ mutationFn: (r: Registration) => api.register(r) });
}

/** Người đang đăng nhập xác nhận email: hồ sơ đổi `emailVerified`, dải nhắc ở trang Cá nhân phải biến mất. */
export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => api.verifyEmail(email, code),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.me() }),
  });
}

export function useResendCode() {
  return useMutation({ mutationFn: (email: string) => api.resendCode(email) });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => api.forgotPassword(email) });
}

/* Kênh hỗ trợ không cần đăng nhập: khiếu nại khoá tài khoản, xin xoá tài khoản. Không mở phiên, không đụng cache. */

export function useRequestLockAppealCode() {
  return useMutation({ mutationFn: (email: string) => api.requestLockAppealCode(email) });
}

export function useFileLockAppeal() {
  return useMutation({
    mutationFn: ({ email, code, statement }: { email: string; code: string; statement: string }) =>
      api.fileLockAppeal(email, code, statement),
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.requestAccountDeletion(email, password),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ email, code, password }: { email: string; code: string; password: string }) =>
      api.resetPassword(email, code, password),
  });
}

/**
 * Đăng xuất: báo server thu hồi phiên, rồi xoá phiên trên máy kể cả khi server không nhận được — người dùng
 * đã bấm đăng xuất thì máy này không được giữ phiên; phiên bên server tự hết hạn. Không điều hướng (HARD#18).
 */
export function useSignOut() {
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => useAuthStore.getState().signOut(),
  });
}
