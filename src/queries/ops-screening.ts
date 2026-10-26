import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryScreening, screeningApi } from '@/api/ops-screening';
import { qk } from './keys';

/*
 * Cấu hình máy duyệt ngoài bật / tắt luật chung: luật và ngưỡng riêng theo danh mục, cụm từ cấm, danh sách trắng ảnh,
 * từ khoá danh mục. Mỗi lần đổi luật hay ngưỡng là một phiên bản luật mới ở server, có hiệu lực từ lượt gửi kế tiếp.
 */

/** Luật nhìn từ một danh mục — đọc chung bộ luật đầy đủ, mọi danh mục dùng một lượt tải. */
export function useCategoryScreening(categoryId: string) {
  return useQuery({
    queryKey: qk.ops.screeningBook(),
    queryFn: screeningApi.book,
    select: (book) => categoryScreening(book, categoryId),
    enabled: Boolean(categoryId),
  });
}

/** Ghi đè, bỏ ghi đè, ngưỡng dải: server trả cả bộ luật mới (bỏ ghi đè thì không) — màn "Luật" chung đọc lại. */
function useBookMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.ops.screeningBook() });
      void qc.invalidateQueries({ queryKey: qk.ops.screeningRules() });
    },
  });
}

export const useSetRuleOverride = () => useBookMutation(screeningApi.setOverride);
export const useClearRuleOverride = () => useBookMutation(screeningApi.clearOverride);
export const useSetBands = () => useBookMutation(screeningApi.setBands);

export function usePhrases() {
  return useQuery({ queryKey: qk.ops.phrases(), queryFn: screeningApi.phrases });
}

function usePhraseMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.phrases() }),
  });
}

export const useCreatePhrase = () => usePhraseMutation(screeningApi.createPhrase);
export const useUpdatePhrase = () => usePhraseMutation(screeningApi.updatePhrase);
export const useActivatePhrase = () => usePhraseMutation(screeningApi.activatePhrase);
export const useDeactivatePhrase = () => usePhraseMutation(screeningApi.deactivatePhrase);

export function useWhitelist() {
  return useQuery({ queryKey: qk.ops.whitelist(), queryFn: screeningApi.whitelist });
}

function useWhitelistMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.whitelist() }),
  });
}

export const useAddWhitelist = () => useWhitelistMutation(screeningApi.addWhitelist);
export const useRemoveWhitelist = () => useWhitelistMutation(screeningApi.removeWhitelist);

export function useCategoryKeywords(categoryId: string) {
  return useQuery({
    queryKey: qk.ops.keywords(categoryId),
    queryFn: () => screeningApi.keywords(categoryId),
    enabled: Boolean(categoryId),
  });
}

/** Server trả bộ đã bỏ dấu: ghi thẳng vào cache, màn hiện đúng dạng máy so. */
export function useSetKeywords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: screeningApi.setKeywords,
    onSuccess: (keywords, { categoryId }) => qc.setQueryData(qk.ops.keywords(categoryId), keywords),
  });
}
