import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setHttpAccessToken } from '@/api/http';
import { mockApi } from '@/api/mock';
import { useAuthStore } from '@/stores/auth';

/**
 * Cầu nối store → tầng HTTP: `src/api/**` không được import `stores/**` (folder.convention §6), nên
 * token phải được đẩy xuống từ đây. Gọi MỘT lần ở `app/_layout.tsx`, trước khi màn con nào gọi query.
 *
 * Đăng ký bằng `subscribe` chứ không đọc qua render: token đổi lúc đăng nhập/đăng xuất phải tới tầng
 * HTTP ngay trong cùng tick, không đợi lượt render kế tiếp của layout.
 */
export function useSyncAccessToken(): void {
  useEffect(() => {
    setHttpAccessToken(useAuthStore.getState().session?.accessToken ?? null);
    return useAuthStore.subscribe((s) => setHttpAccessToken(s.session?.accessToken ?? null));
  }, []);
}

/**
 * Đăng nhập. Đang dùng `mockApi.login` (mọi email, mật khẩu từ 8 ký tự) để mở được các màn cần phiên
 * khi backend chưa có `identity/sessions`; đổi sang `api.login` khi ghim-server archive `add-identity`.
 * Token giả không tới backend nào: chưa endpoint nào khai `bearerAuth`.
 *
 * Không điều hướng sau khi `signIn` (HARD#18): `Stack.Protected` gỡ màn login khỏi stack.
 */
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      mockApi.login(email.trim(), password),
    onSuccess: (session) => useAuthStore.getState().signIn(session),
  });
}

/**
 * Đăng xuất = xoá phiên VÀ dọn sạch cache. Thiếu vế thứ hai thì người đăng nhập kế tiếp thấy dữ liệu
 * của phiên trước cho tới lần refetch đầu tiên. Không tự điều hướng (HARD#18): `Stack.Protected`
 * trong `app/_layout.tsx` lo phần đó.
 */
export function useSignOut() {
  const qc = useQueryClient();
  return () => {
    useAuthStore.getState().signOut();
    qc.clear();
  };
}
