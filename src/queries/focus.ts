import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { qk } from './keys';

/**
 * Màn trong tab không mount lại khi quay về tab, nên dữ liệu đổi ở nơi khác (người bán đánh dấu đã bán, tin vừa được
 * duyệt) chỉ hiện khi mở lại app. Lần focus đầu bỏ qua — màn vừa tải lúc mount; các lần sau tải lại query đang dùng mà
 * đã cũ hơn `staleTime`, nên chuyển tab qua lại liên tục không bắn request.
 */
function useRefreshOnFocus(...keys: QueryKey[]): void {
  const qc = useQueryClient();
  const focusedBefore = useRef(false);
  // Key là mảng mới mỗi lần render: so theo chuỗi để callback không đổi, focus effect không chạy lại vô cớ.
  const id = JSON.stringify(keys);
  useFocusEffect(
    useCallback(() => {
      if (!focusedBefore.current) {
        focusedBefore.current = true;
        return;
      }
      for (const queryKey of JSON.parse(id) as QueryKey[]) {
        void qc.refetchQueries({ queryKey, type: 'active', stale: true });
      }
    }, [qc, id]),
  );
}

/** Các kệ của trang Cá nhân: tin đang đăng và đã bán (chung một query), tin đã lưu. */
export const useRefreshShelvesOnFocus = () =>
  useRefreshOnFocus(qk.listings.mine(), qk.listings.saved());
