import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useIsAuthenticated } from '@/stores/auth';
import { qk } from './keys';

/* Màn "Cảnh cáo của tôi": điểm vi phạm, từng cảnh cáo, khiếu nại. */

export function useMyStanding() {
  const authed = useIsAuthenticated();
  return useQuery({ queryKey: qk.standing(), queryFn: api.getMyStanding, enabled: authed });
}

/** Server trả lại cảnh cáo đã gắn khiếu nại, nhưng `appealable` của cả bảng đổi theo — đọc lại cả bảng. */
export function useAppealStrike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ strikeId, statement }: { strikeId: string; statement: string }) =>
      api.appealStrike(strikeId, statement),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.standing() }),
  });
}
