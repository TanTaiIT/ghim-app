import { auditActionLabel, auditTargetLabel, detailsLabel, jobLabel } from './admin-labels';
import { unwrap, unwrapEmpty } from './client';
import {
  deleteApiV1OpsDisposableDomainsByDomain,
  getApiV1OpsAudit,
  getApiV1OpsCategoriesByIdSettingsVersionsByVersion,
  getApiV1OpsConfig,
  getApiV1OpsConfigVersionsByVersion,
  getApiV1OpsDisposableDomains,
  getApiV1OpsJobsRuns,
  getApiV1OpsReviewStatsReviewers,
  getApiV1OpsReviewStatsRules,
  getApiV1OpsTrustRuleArticles,
  patchApiV1OpsTrustRuleArticlesByArticleId,
  postApiV1OpsConfig,
  postApiV1OpsDisposableDomains,
  postApiV1OpsTrustAccountsByAccountIdAmnesty,
  postApiV1OpsTrustRuleArticles,
  postApiV1OpsTrustStrikesByStrikeIdComments,
  postApiV1OpsTrustStrikesByStrikeIdLift,
} from './generated/sdk.gen';
import type {
  GetApiV1OpsAuditData,
  GetApiV1OpsAuditResponses,
  GetApiV1OpsCategoriesByIdSettingsVersionsByVersionResponses,
  GetApiV1OpsConfigResponses,
  GetApiV1OpsDisposableDomainsResponses,
  GetApiV1OpsJobsRunsResponses,
  GetApiV1OpsTrustRuleArticlesResponses,
} from './generated/types.gen';

/*
 * Quản trị hệ thống và quy định sàn trên bàn vận hành (master, trừ nhận xét vào gậy là của staff): ân xá, gỡ khoá vĩnh
 * viễn, quy định sàn, bảng con số, miền email dùng một lần, nhật ký vận hành, lượt chạy việc nền, thống kê người duyệt
 * và luật, lịch sử cài đặt danh mục. Kiểu wire không rò khỏi file này.
 */

type WireArticle = GetApiV1OpsTrustRuleArticlesResponses[200]['data'][number];
type WireConfig = GetApiV1OpsConfigResponses[200]['data'];
type WireDomain = GetApiV1OpsDisposableDomainsResponses[200]['data']['items'][number];
type WireAudit = GetApiV1OpsAuditResponses[200]['data']['items'][number];
type WireJobRun = GetApiV1OpsJobsRunsResponses[200]['data'][number];
type WireSettings = GetApiV1OpsCategoriesByIdSettingsVersionsByVersionResponses[200]['data'];

/** Một trang theo số trang của server (`page`, `totalPages`). */
export type Paged<T> = { items: T[]; page: number; totalPages: number; total: number };

/** Điều quy định sàn, trích khi ra gậy. Gậy đã ra giữ bản trích của nó — sửa điều không đổi gậy cũ. */
export type RuleArticle = {
  id: string;
  code: string;
  title: string;
  text: string;
  active: boolean;
  sort: number;
};

const toArticle = (w: WireArticle): RuleArticle => ({
  id: w.id,
  code: w.code,
  title: w.title,
  text: w.text,
  active: w.active,
  sort: w.sort,
});

/** Một phiên bản của bảng con số (TK 28). Giá trị là số nguyên; trần, sàn của từng khoá do server kiểm. */
export type ConfigVersion = {
  version: number;
  values: Record<string, number>;
  note: string | null;
  createdAt: string;
};

const toConfig = (w: WireConfig): ConfigVersion => ({
  version: w.version,
  values: Object.fromEntries(
    Object.entries(w.values as Record<string, unknown>).flatMap(([k, v]) =>
      typeof v === 'number' ? [[k, v]] : [],
    ),
  ),
  note: w.note ?? null,
  createdAt: w.createdAt,
});

/** `removedAt` khác null: miền đã bỏ chặn — giữ dòng để lượt cập nhật tự động không thêm lại. */
export type DisposableDomain = {
  domain: string;
  manual: boolean;
  addedAt: string;
  removedAt: string | null;
};

const toDomain = (w: WireDomain): DisposableDomain => ({
  domain: w.domain,
  manual: w.source === 'manual',
  addedAt: w.addedAt,
  removedAt: w.removedAt ?? null,
});

export type AuditEntry = {
  id: string;
  actorId: string | null;
  byMaster: boolean;
  action: string;
  target: string;
  reason: string | null;
  details: string | null;
  at: string;
};

const toAudit = (w: WireAudit): AuditEntry => ({
  id: w.id,
  actorId: w.actorId ?? null,
  byMaster: w.actorRole === 'master',
  action: auditActionLabel(w.action),
  target: auditTargetLabel(w.targetType, w.targetId),
  reason: w.reason ?? null,
  details: w.details ? detailsLabel(w.details) : null,
  at: w.createdAt,
});

export type AuditFilter = Pick<
  NonNullable<GetApiV1OpsAuditData['query']>,
  'actorId' | 'targetType' | 'targetId'
>;

export type JobRun = {
  id: string;
  name: string;
  status: WireJobRun['status'];
  startedAt: string;
  finishedAt: string | null;
  summary: string | null;
  error: string | null;
};

export const JOB_STATUS_LABEL: Record<JobRun['status'], string> = {
  done: 'Xong',
  partial: 'Làm được một phần',
  failed: 'Lỗi',
};

const toJobRun = (w: WireJobRun): JobRun => ({
  id: w.id,
  name: jobLabel(w.name),
  status: w.status,
  startedAt: w.startedAt,
  finishedAt: w.finishedAt ?? null,
  summary: w.summary ? detailsLabel(w.summary) : null,
  error: w.error ?? null,
});

/** `rate` = phần quyết định "đạt" bị lật khi hậu kiểm (0–1); `null` khi chưa có quyết định nào để tính. */
export type ReviewerStat = {
  accountId: string;
  name: string | null;
  reviewed: number;
  overturned: number;
  rate: number | null;
};

/** `passRate` = phần tin máy giữ vì luật này mà người cho đạt (0–1) — cao là máy quá tay. */
export type RuleStat = {
  code: string;
  decided: number;
  passed: number;
  overreach: number;
  passRate: number | null;
};

export type CategorySettingsVersion = {
  version: number;
  priceCap: number | null;
  referencePrice: number | null;
  riskLevel: WireSettings['riskLevel'];
  alwaysManual: boolean;
  groupReview: WireSettings['groupReview'];
  createdAt: string;
};

const PAGE = 50;

export const adminApi = {
  /** Ân xá gậy thường / nặng đang tính của một người — trả lịch sử gậy mới. */
  amnesty: async (d: { accountId: string; strikeIds: string[]; reason: string }): Promise<void> => {
    await unwrap(
      postApiV1OpsTrustAccountsByAccountIdAmnesty({
        path: { accountId: d.accountId },
        body: { strikeIds: d.strikeIds, reason: d.reason },
      }),
    );
  },

  /** Gỡ khoá vĩnh viễn: tài khoản mở khoá, email thôi bị chặn. */
  liftPermanent: async (strikeId: string): Promise<void> => {
    await unwrap(postApiV1OpsTrustStrikesByStrikeIdLift({ path: { strikeId } }));
  },

  /** Nhận xét của staff vào hồ sơ vi phạm nghiêm trọng đang chờ master. */
  commentStrike: async (d: { strikeId: string; body: string }): Promise<void> => {
    await unwrap(
      postApiV1OpsTrustStrikesByStrikeIdComments({
        path: { strikeId: d.strikeId },
        body: { body: d.body.trim() },
      }),
    );
  },

  ruleArticles: async (): Promise<RuleArticle[]> =>
    (await unwrap(getApiV1OpsTrustRuleArticles({ query: { includeInactive: 'true' } })))
      .map(toArticle)
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code)),

  createRuleArticle: async (d: {
    code: string;
    title: string;
    text: string;
    sort?: number;
  }): Promise<RuleArticle> => toArticle(await unwrap(postApiV1OpsTrustRuleArticles({ body: d }))),

  updateRuleArticle: async ({
    id,
    ...body
  }: {
    id: string;
    title?: string;
    text?: string;
    active?: boolean;
    sort?: number;
  }): Promise<RuleArticle> =>
    toArticle(
      await unwrap(patchApiV1OpsTrustRuleArticlesByArticleId({ path: { articleId: id }, body })),
    ),

  config: async (): Promise<ConfigVersion> => toConfig(await unwrap(getApiV1OpsConfig())),

  configVersion: async (version: number): Promise<ConfigVersion> =>
    toConfig(await unwrap(getApiV1OpsConfigVersionsByVersion({ path: { version } }))),

  /** Tạo phiên bản mới từ `baseVersion`; người khác vừa lưu trước thì 409 — đọc lại rồi sửa tiếp. */
  saveConfig: async (d: {
    baseVersion: number;
    changes: Record<string, number>;
    note?: string;
  }): Promise<ConfigVersion> =>
    toConfig(
      await unwrap(
        postApiV1OpsConfig({
          body: {
            baseVersion: d.baseVersion,
            changes: d.changes,
            ...(d.note ? { note: d.note } : {}),
          },
        }),
      ),
    ),

  domains: async (page: number): Promise<Paged<DisposableDomain>> => {
    const p = await unwrap(getApiV1OpsDisposableDomains({ query: { page, limit: PAGE } }));
    return { items: p.items.map(toDomain), page: p.page, totalPages: p.totalPages, total: p.total };
  },

  addDomain: async (domain: string): Promise<void> => {
    await unwrap(postApiV1OpsDisposableDomains({ body: { domain: domain.trim().toLowerCase() } }));
  },

  removeDomain: (domain: string): Promise<void> =>
    unwrapEmpty(deleteApiV1OpsDisposableDomainsByDomain({ path: { domain } })),

  audit: async (page: number, filter: AuditFilter): Promise<Paged<AuditEntry>> => {
    const p = await unwrap(getApiV1OpsAudit({ query: { page, limit: PAGE, ...filter } }));
    return { items: p.items.map(toAudit), page: p.page, totalPages: p.totalPages, total: p.total };
  },

  jobRuns: async (): Promise<JobRun[]> =>
    (await unwrap(getApiV1OpsJobsRuns({ query: { limit: 100 } }))).map(toJobRun),

  reviewerStats: async (): Promise<ReviewerStat[]> => unwrap(getApiV1OpsReviewStatsReviewers()),

  ruleStats: async (): Promise<RuleStat[]> => unwrap(getApiV1OpsReviewStatsRules()),

  categorySettings: async (d: {
    categoryId: string;
    version: number;
  }): Promise<CategorySettingsVersion> => {
    const w = await unwrap(
      getApiV1OpsCategoriesByIdSettingsVersionsByVersion({
        path: { id: d.categoryId, version: d.version },
      }),
    );
    return {
      version: w.version,
      priceCap: w.priceCap ?? null,
      referencePrice: w.referencePrice ?? null,
      riskLevel: w.riskLevel,
      alwaysManual: w.alwaysManual,
      groupReview: w.groupReview,
      createdAt: w.createdAt,
    };
  },
};
