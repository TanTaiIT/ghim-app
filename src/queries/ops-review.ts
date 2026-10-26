import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { opsApi, type OpsTask, type TaskDecision } from '@/api/ops';
import { qk } from './keys';

/*
 * Hàng chờ của bàn vận hành. Không có realtime cho phía này (socket chỉ mở cho người dùng app), mà hàng chờ đổi do máy
 * và người khác — nên hàng chờ tự tải lại mỗi phút thay vì đợi người duyệt kéo xuống.
 */
const QUEUE_REFRESH_MS = 60_000;

/**
 * Hàng chờ theo số hàng; `null` = mọi việc tôi thấy. Cổng khu quản trị (`app/ops/_layout.tsx`) đọc lỗi của query này để
 * chặn cả khu khi server đòi xác thực hai lớp; 403 thì không chặn — staff không có danh mục nào cũng nhận 403 ở đây.
 */
export function useOpsTasks(queue: number | null) {
  return useQuery({
    queryKey: qk.ops.tasks(queue),
    queryFn: () => opsApi.tasks(queue),
    placeholderData: keepPreviousData,
    refetchInterval: QUEUE_REFRESH_MS,
    // 403 không tự hết khi hỏi lại — hỏi lại chỉ làm cổng hiện chậm thêm một nhịp.
    retry: false,
  });
}

export function useOpsTask(id: string) {
  return useQuery({
    queryKey: qk.ops.task(id),
    queryFn: () => opsApi.task(id),
    enabled: Boolean(id),
  });
}

/** Bảng đếm theo hàng — chỉ master gọi được, staff nhận 403 nên không hỏi. */
export function useReviewBoard(enabled: boolean) {
  return useQuery({
    queryKey: qk.ops.board(),
    queryFn: opsApi.board,
    enabled,
    refetchInterval: QUEUE_REFRESH_MS,
  });
}

/**
 * Nhận + quyết một việc. Việc đã quyết rời mọi hàng chờ và bảng đếm; bối cảnh của nó cũng hết đúng (tin đổi trạng
 * thái), nên quét cả nhánh `ops` thay vì vá từng danh sách.
 */
export function useDecideTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      task,
      decision,
    }: {
      task: Pick<OpsTask, 'id' | 'reasons'>;
      decision: TaskDecision;
    }) => opsApi.decide(task, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.all() }),
  });
}

/**
 * Gỡ thẳng / khôi phục một tin sàn: tin rời hay trở lại bảng tin, tìm kiếm, chi tiết — đọc lại cả nhánh tin; số liệu bàn
 * vận hành cũng đổi theo quyết định mới.
 */
function useListingDecision<V>(fn: (v: V) => Promise<void>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.listings.all() });
      void qc.invalidateQueries({ queryKey: qk.ops.all() });
    },
  });
}

export const useRemoveListing = () =>
  useListingDecision((d: { id: string; reasonTemplateId: string }) => opsApi.removeListing(d));
export const useRestoreListing = () =>
  useListingDecision((id: string) => opsApi.restoreListing(id));

/** Lý do mẫu cho "sai sót". Staff chỉ nhận lý do đang bật; master nhận cả lý do đã tắt. */
export function useReasonTemplates() {
  return useQuery({ queryKey: qk.ops.reasons(), queryFn: opsApi.reasonTemplates });
}

export function useAddReasonTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => opsApi.addReasonTemplate(text),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.reasons() }),
  });
}

export function useSetReasonTemplateActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      opsApi.setReasonTemplateActive(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.reasons() }),
  });
}
