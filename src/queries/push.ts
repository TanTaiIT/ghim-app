import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { devicePushToken, pushTapOf, useLastPushResponse, type PushTap } from '@/api/push';
import { useAuthStore, useIsAuthenticated, usePushOff } from '@/stores/auth';

/** Lấy token của máy và gắn vào phiên; `false` = máy chưa nhận được thông báo đẩy (xem `devicePushToken`). */
async function registerDevice(ask: boolean): Promise<boolean> {
  const token = await devicePushToken(ask);
  if (token === null) return false;
  await api.setPushToken(token);
  return true;
}

/**
 * Gọi MỘT lần ở `app/_layout.tsx`, cạnh `useRealtimeBridge` (layout nằm ngoài `QueryClientProvider` nên không dùng
 * mutation): có phiên mà máy chưa tắt thông báo thì đăng ký token — mỗi phiên một lần, vì server gắn token vào phiên.
 * Lần đầu hệ điều hành hỏi quyền ở đây, ngay sau khi đăng nhập.
 */
export function usePushBridge(): void {
  const authed = useIsAuthenticated();
  const off = usePushOff();
  useEffect(() => {
    if (!authed || off) return;
    // Việc nền, không có bề mặt lỗi nào hợp để báo (mạng chập chờn, server đang ngủ): lần mở app sau thử lại, còn
    // công tắc trong Cài đặt › Thông báo hiện lỗi thật khi người dùng tự bật.
    registerDevice(true).catch(() => {});
  }, [authed, off]);
}

/**
 * Người dùng bấm một thông báo (cả lúc app đang tắt hẳn): gọi `onTap` đúng một lần cho mỗi lượt bấm, và chỉ khi điều
 * hướng được (`ready` — Stack đã dựng, phiên đã đọc xong).
 */
export function usePushTaps(ready: boolean, onTap: (tap: PushTap) => void): void {
  const last = useLastPushResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !last) return;
    const tap = pushTapOf(last);
    if (handled.current === tap.key) return;
    handled.current = tap.key;
    onTap(tap);
  }, [ready, last, onTap]);
}

/**
 * Công tắc "Thông báo trên máy này". Tắt: gỡ token khỏi phiên rồi nhớ lựa chọn trên máy. Bật: hỏi quyền nếu còn hỏi
 * được — trả `false` khi máy chưa cho phép, để màn hình chỉ chỗ bật trong cài đặt của điện thoại.
 */
export function useSetPushEnabled() {
  return useMutation({
    mutationFn: async (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        await api.clearPushToken();
        useAuthStore.getState().setPushOff(true);
        return true;
      }
      useAuthStore.getState().setPushOff(false);
      return registerDevice(true);
    },
  });
}
