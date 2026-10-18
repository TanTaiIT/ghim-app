import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import { connectRealtime } from '@/api/realtime';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/**
 * Cầu nối kênh realtime ↔ cache query: gọi MỘT lần ở `app/_layout.tsx`, cạnh `useAuthBridge` (layout nằm ngoài
 * `QueryClientProvider` nên `qc` đi qua tham số).
 *
 * Chỉ nối khi đã đăng nhập VÀ app đang ở trước mặt: server coi "có kết nối" là "đang hoạt động" (trạng thái hoạt động
 * trong chat), nên giữ kết nối lúc app nằm nền là để người khác thấy mình online sai. Nối lại thì tải lại hội thoại vì
 * sự kiện phát lúc mất kết nối không được gửi bù.
 */
export function useRealtimeBridge(qc: QueryClient): void {
  const authed = useIsAuthenticated();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!authed || !foreground) return undefined;
    const connection = connectRealtime({
      onConnect: () => void qc.invalidateQueries({ queryKey: qk.conversations.all() }),
      onEvent: (event) => {
        void qc.invalidateQueries({ queryKey: qk.conversations.detail(event.conversationId) });
        if (event.type === 'message:new') {
          void qc.invalidateQueries({ queryKey: qk.conversations.list() });
        }
      },
    });
    return () => connection.close();
  }, [authed, foreground, qc]);
}
