import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setHttpAccessToken } from '@/api/http';
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
