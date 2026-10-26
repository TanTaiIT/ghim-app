import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AuditFilter } from '@/api/ops-admin';
import { qk } from './keys';

/* Quản trị hệ thống và quy định sàn trên bàn vận hành — xem `src/api/ops-admin.ts`. */

// ── GẬY ──────────────────────────────────────────────────────────────────────────────────────────

/** Ân xá, gỡ khoá đổi lịch sử gậy, điểm vi phạm và trạng thái khoá của người đó. */
function useStrikeMutation<V>(fn: (v: V) => Promise<unknown>, accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.ops.strikes(accountId) });
      void qc.invalidateQueries({ queryKey: qk.ops.accountsAll() });
    },
  });
}

export const useAmnesty = (accountId: string) => useStrikeMutation(adminApi.amnesty, accountId);
export const useLiftPermanent = (accountId: string) =>
  useStrikeMutation(adminApi.liftPermanent, accountId);

/** Nhận xét hiện trong hồ sơ gậy của việc đang mở. */
export function useCommentStrike(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.commentStrike,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.task(taskId) }),
  });
}

// ── QUY ĐỊNH SÀN ─────────────────────────────────────────────────────────────────────────────────

export function useRuleArticles() {
  return useQuery({ queryKey: qk.ops.ruleArticles(), queryFn: adminApi.ruleArticles });
}

function useArticleMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.ruleArticles() }),
  });
}

export const useCreateRuleArticle = () => useArticleMutation(adminApi.createRuleArticle);
export const useUpdateRuleArticle = () => useArticleMutation(adminApi.updateRuleArticle);

// ── BẢNG CON SỐ ──────────────────────────────────────────────────────────────────────────────────

export function useConfig() {
  return useQuery({ queryKey: qk.ops.config(), queryFn: adminApi.config });
}

/** Phiên bản cũ không đổi nữa: tải một lần. */
export function useConfigVersion(version: number) {
  return useQuery({
    queryKey: qk.ops.configVersion(version),
    queryFn: () => adminApi.configVersion(version),
    enabled: version > 0,
    staleTime: Infinity,
  });
}

export function useSaveConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.saveConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.configAll() }),
  });
}

// ── MIỀN EMAIL DÙNG MỘT LẦN ──────────────────────────────────────────────────────────────────────

export function useDomains(page: number) {
  return useQuery({
    queryKey: qk.ops.domains(page),
    queryFn: () => adminApi.domains(page),
    placeholderData: keepPreviousData,
  });
}

function useDomainMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ops.domainsAll() }),
  });
}

export const useAddDomain = () => useDomainMutation(adminApi.addDomain);
export const useRemoveDomain = () => useDomainMutation(adminApi.removeDomain);

// ── NHẬT KÝ, VIỆC NỀN, THỐNG KÊ, LỊCH SỬ DANH MỤC ────────────────────────────────────────────────

export function useAudit(page: number, filter: AuditFilter) {
  return useQuery({
    queryKey: qk.ops.audit(page, filter),
    queryFn: () => adminApi.audit(page, filter),
    placeholderData: keepPreviousData,
  });
}

export function useJobRuns() {
  return useQuery({ queryKey: qk.ops.jobRuns(), queryFn: adminApi.jobRuns });
}

export function useReviewerStats() {
  return useQuery({ queryKey: qk.ops.reviewerStats(), queryFn: adminApi.reviewerStats });
}

export function useRuleStats() {
  return useQuery({ queryKey: qk.ops.ruleStats(), queryFn: adminApi.ruleStats });
}

/** Phiên bản cài đặt cũ không đổi nữa: tải một lần. */
export function useCategorySettingsVersion(categoryId: string, version: number) {
  return useQuery({
    queryKey: qk.ops.categorySettings(categoryId, version),
    queryFn: () => adminApi.categorySettings({ categoryId, version }),
    enabled: Boolean(categoryId) && version > 0,
    staleTime: Infinity,
  });
}
