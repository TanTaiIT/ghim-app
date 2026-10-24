import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi } from '@/api/ops';
import { qk } from './keys';

/* Luật của máy duyệt trên bàn vận hành (chỉ master): bật, chạy thử, tắt từng luật. */

export function useScreeningRules() {
  return useQuery({ queryKey: qk.ops.screeningRules(), queryFn: opsApi.screeningRules });
}

/** Server trả cả bộ luật sau khi đổi: ghi thẳng vào cache, không đọc lại. */
export function useSetRuleMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opsApi.setRuleMode,
    onSuccess: (rules) => qc.setQueryData(qk.ops.screeningRules(), rules),
  });
}
