import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type CategorySettings, type NewCategory } from '@/api/ops';
import type { TemplateField } from '@/api/client';
import { qk } from './keys';

/*
 * Danh mục trên bàn vận hành (master). Danh mục ban đầu do master nhập — server không có sẵn danh mục nào (TK 13). Đổi
 * ở đây làm lệch cả danh sách công khai mà màn đăng tin và bộ lọc tìm kiếm đang dùng (`qk.categories()`).
 */

export function useOpsCategories() {
  return useQuery({ queryKey: qk.ops.categories(), queryFn: opsApi.categories });
}

function useCategoryMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.ops.categories() });
      void qc.invalidateQueries({ queryKey: qk.categories() });
    },
  });
}

export const useCreateCategory = () =>
  useCategoryMutation((c: NewCategory) => opsApi.createCategory(c));
export const useRenameCategory = () =>
  useCategoryMutation((d: { id: string; name: string }) => opsApi.renameCategory(d));
export const useSetCategoryActive = () =>
  useCategoryMutation((d: { id: string; active: boolean }) => opsApi.setCategoryActive(d));

/** Lưu cài đặt máy duyệt đổi thẻ danh mục ở bàn vận hành; danh sách công khai không mang cài đặt nên không đụng. */
export function useSetCategorySettings(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: CategorySettings) => opsApi.setCategorySettings(id, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.categories() }),
  });
}

export function useTemplateDraft(id: string) {
  return useQuery({
    queryKey: qk.ops.templateDraft(id),
    queryFn: () => opsApi.templateDraft(id),
    enabled: Boolean(id),
  });
}

export function useSaveTemplateDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ base, fields }: { base: number; fields: TemplateField[] }) =>
      opsApi.saveTemplateDraft(id, base, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.templateDraft(id) }),
  });
}

/** Bỏ nháp hay phát hành đều đổi bản nháp; phát hành còn đổi số phiên bản mẫu và mẫu công khai mà màn đăng tin đọc. */
function useTemplateWrite(id: string, write: () => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.ops.categories() });
      void qc.invalidateQueries({ queryKey: qk.template(id) });
      void qc.invalidateQueries({ queryKey: qk.categories() });
    },
  });
}

export const useDiscardTemplateDraft = (id: string) =>
  useTemplateWrite(id, () => opsApi.discardTemplateDraft(id));
export const usePublishTemplate = (id: string) =>
  useTemplateWrite(id, () => opsApi.publishTemplate(id));
