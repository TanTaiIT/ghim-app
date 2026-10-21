import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type NewCategory } from '@/api/ops';
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
