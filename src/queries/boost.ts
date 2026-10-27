import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boostApi, type BoostAction } from '@/api/boost';
import { qk } from './keys';

/**
 * Quyền đẩy tin của người xem với một tin (add-admin-boost). Chỉ hỏi khi người xem có thể có vai — người khác nhận 403,
 * và 403 là câu trả lời "không có nút", không phải lỗi để hỏi lại.
 */
export function useBoostState(id: string, enabled: boolean) {
  return useQuery({
    queryKey: qk.listings.boost(id),
    queryFn: () => boostApi.state(id),
    enabled,
    retry: false,
  });
}

/**
 * Đẩy lên đầu, đặt / bỏ nổi bật. Thứ tự bảng tin, dải nổi bật và nhãn "Nổi bật" của thẻ đều đổi — cả nhánh tin đọc
 * lại; tin trong nhóm thì bảng tin và dải của nhóm đó nữa.
 */
export function useApplyBoost(id: string, groupId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: BoostAction) => boostApi.apply(id, action),
    onSuccess: (state) => {
      qc.setQueryData(qk.listings.boost(id), state);
      void qc.invalidateQueries({ queryKey: qk.listings.all() });
      if (groupId) {
        void qc.invalidateQueries({ queryKey: qk.groups.listings(groupId) });
        void qc.invalidateQueries({ queryKey: qk.groups.featured(groupId) });
      }
    },
  });
}
