import { useMutation, useQueryClient } from '@tanstack/react-query';
import { opsApi, type HelpTopicInput } from '@/api/ops';
import { qk } from './keys';

/* Master soạn trợ giúp (ghim-server add-help-content). Đọc dùng chung `useHelpTopics` với màn trợ giúp của người dùng. */

export function useSaveHelpTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, topic }: { id: string | null; topic: HelpTopicInput }) =>
      id === null ? opsApi.createHelpTopic(topic) : opsApi.updateHelpTopic(id, topic),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.help() }),
  });
}

export function useDeleteHelpTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => opsApi.deleteHelpTopic(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.help() }),
  });
}

/** Lỗi (409 khi danh sách vừa đổi) cũng tải lại, để lần sắp sau dựa trên danh sách thật. */
export function useReorderHelpTopics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => opsApi.reorderHelpTopics(ids),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.help() }),
  });
}
