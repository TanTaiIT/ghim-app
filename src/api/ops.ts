import { unwrap, unwrapEmpty, type Picture } from './client';
import {
  getApiV1OpsCategories,
  getApiV1OpsGroups,
  getApiV1OpsGroupsByGroupId,
  getApiV1OpsIdVerifications,
  getApiV1OpsReviewReasonTemplates,
  getApiV1OpsReviewStatsBoard,
  getApiV1OpsReviewTasks,
  getApiV1OpsReviewTasksByTaskId,
  getApiV1OpsScreeningRules,
  getApiV1OpsSupportConversations,
  getApiV1OpsSupportConversationsByConversationId,
  getApiV1OpsSupportConversationsByConversationIdMessages,
  getApiV1OpsTrustAccountsByAccountIdStrikes,
  patchApiV1OpsCategoriesById,
  patchApiV1OpsReviewReasonTemplatesByTemplateId,
  patchApiV1OpsScreeningRulesByCode,
  postApiV1OpsAccountsByIdLock,
  postApiV1OpsAccountsByIdUnlock,
  postApiV1OpsCategories,
  postApiV1OpsCategoriesByIdDisable,
  postApiV1OpsCategoriesByIdEnable,
  postApiV1OpsGroups,
  postApiV1OpsGroupsByGroupIdClose,
  postApiV1OpsGroupsByGroupIdLock,
  postApiV1OpsGroupsByGroupIdUnlock,
  postApiV1OpsIdVerificationsByIdDecision,
  postApiV1OpsReviewReasonTemplates,
  postApiV1OpsReviewTasksByTaskIdClaim,
  postApiV1OpsReviewTasksByTaskIdDecision,
  postApiV1OpsSupportConversationsByConversationIdMessages,
  postApiV1OpsSupportConversationsByConversationIdRead,
} from './generated/sdk.gen';
import type {
  GetApiV1OpsCategoriesResponses,
  GetApiV1OpsGroupsByGroupIdResponses,
  GetApiV1OpsGroupsResponses,
  GetApiV1OpsIdVerificationsResponses,
  GetApiV1OpsReviewTasksByTaskIdResponses,
  GetApiV1OpsReviewTasksResponses,
  GetApiV1OpsScreeningRulesResponses,
  GetApiV1OpsSupportConversationsResponses,
  GetApiV1OpsSupportConversationsByConversationIdMessagesResponses,
  GetApiV1OpsTrustAccountsByAccountIdStrikesResponses,
  PostApiV1OpsCategoriesData,
  PostApiV1OpsGroupsData,
  PostApiV1OpsReviewTasksByTaskIdDecisionData,
} from './generated/types.gen';

/*
 * Bàn vận hành (`/api/v1/ops/*`) cho master và staff — tách khỏi `client.ts` vì người dùng thường không bao giờ chạm tới
 * phần này. Cùng luật với `client.ts`: mọi hàm gọi SDK và đi qua `unwrap`, kiểu wire không rò ra khỏi file.
 * Hợp đồng nghiệp vụ: `ghim-server/docs/review.md`, `docs/strikes.md`, `docs/messaging.md`.
 */

type WireTask = GetApiV1OpsReviewTasksResponses[200]['data']['items'][number];
type WireTaskDetail = GetApiV1OpsReviewTasksByTaskIdResponses[200]['data'];
type WireStrike = GetApiV1OpsTrustAccountsByAccountIdStrikesResponses[200]['data'][number];
type WireIdCheck = GetApiV1OpsIdVerificationsResponses[200]['data']['items'][number];
type WireGroup = GetApiV1OpsGroupsResponses[200]['data']['items'][number];
type WireRule = GetApiV1OpsScreeningRulesResponses[200]['data']['rules'][number];
type WireGroupDetail = GetApiV1OpsGroupsByGroupIdResponses[200]['data'];
type WireSupport = GetApiV1OpsSupportConversationsResponses[200]['data']['items'][number];
type WireSupportMessage =
  GetApiV1OpsSupportConversationsByConversationIdMessagesResponses[200]['data']['items'][number];
type WireCategory = GetApiV1OpsCategoriesResponses[200]['data'][number];
type WireDecision = PostApiV1OpsReviewTasksByTaskIdDecisionData['body'];

/** Mọi danh sách phân trang của bàn vận hành có cùng vỏ. */
export type OpsPage<T> = { items: T[]; total: number; page: number; totalPages: number };

const page = <W, T>(
  d: { items: W[]; total: number; page: number; totalPages: number },
  map: (w: W) => T,
) => ({ items: d.items.map(map), total: d.total, page: d.page, totalPages: d.totalPages });

/* --------------------------------- việc duyệt --------------------------------- */

export type TaskReason = WireTask['reasons'][number];
export type TaskClaim = WireTask['claim']['state'];

/** Sáu hàng của server (`docs/review.md`). Số là khoá của server, không phải thứ tự hiện. */
export const QUEUE_LABEL: Record<number, string> = {
  0: 'Máy giữ',
  1: 'Báo cáo',
  2: 'Việc về cảnh cáo',
  3: 'Máy hạn chế',
  4: 'Nhóm chuyển lên',
  5: 'Hậu kiểm',
};

export const REASON_LABEL: Record<TaskReason, string> = {
  machine_hold: 'Máy giữ tin',
  machine_restricted: 'Máy hạn chế',
  group_escalation: 'Nhóm chuyển lên',
  sample_risk: 'Mẫu hậu kiểm',
  sample_reviewer: 'Hậu kiểm người duyệt',
  report: 'Bị báo cáo',
  report_severe: 'Báo cáo lừa đảo / hàng cấm',
  appeal: 'Khiếu nại cảnh cáo',
  serious_strike: 'Vi phạm nghiêm trọng',
  permanent_review: 'Xét khoá vĩnh viễn',
};

/** Mã luật máy (`screening.rules.ts` của server) → câu cho người duyệt. Mã lạ hiện nguyên mã. */
const HIT_LABEL: Record<string, string> = {
  gibberish: 'Nội dung vô nghĩa',
  zero_price_high_value: 'Giá 0 đồng cho món giá trị cao',
  shared_device_locked: 'Dùng chung máy với tài khoản bị khoá',
  shared_device_strike: 'Dùng chung máy với tài khoản có cảnh cáo',
  ambiguous_phrase: 'Có cụm từ đáng ngờ',
  abnormal_price: 'Giá bất thường so với danh mục',
  off_platform_contact: 'Kéo liên hệ ra ngoài Ghim',
  own_duplicate: 'Trùng tin khác của chính người đăng',
  burst: 'Đăng dồn dập',
  high_risk_category: 'Danh mục rủi ro cao',
  held_many: 'Người đăng hay bị giữ tin',
  wrong_category: 'Có vẻ sai danh mục',
  new_account: 'Tài khoản mới',
  certain_phrase: 'Trúng cụm từ cấm',
  duplicate_image: 'Ảnh trùng tài khoản khác',
  price_over_cap: 'Giá vượt trần danh mục',
};

export const hitLabel = (code: string): string => HIT_LABEL[code] ?? code;

const REPORT_REASONS: ReadonlySet<TaskReason> = new Set(['report', 'report_severe']);

/**
 * Nhóm nút quyết định mà màn chi tiết dựng cho một việc. Việc gộp nhiều lý do: báo cáo thắng mọi lý do khác vì server
 * bắt buộc `report.verdict` hễ việc có lý do báo cáo. Gậy nghiêm trọng, xét khoá vĩnh viễn chưa có nút trên app.
 */
export type TaskKind = 'screen' | 'report' | 'escalation' | 'appeal' | 'other';

export function taskKind(reasons: readonly TaskReason[]): TaskKind {
  if (reasons.some((r) => REPORT_REASONS.has(r))) return 'report';
  if (reasons.includes('appeal')) return 'appeal';
  if (reasons.includes('serious_strike') || reasons.includes('permanent_review')) return 'other';
  if (reasons.includes('group_escalation') && !reasons.includes('machine_hold'))
    return 'escalation';
  return 'screen';
}

export type OpsTask = {
  id: string;
  subject: WireTask['subjectKind'];
  listingId: string | null;
  accountId: string | null;
  title: string | null;
  queue: number;
  reasons: TaskReason[];
  dueAt: string;
  overdue: boolean;
  /** Việc đã leo tới bậc master — staff không còn thấy nó. */
  atMaster: boolean;
  categoryId: string | null;
  claim: TaskClaim;
};

const toTask = (w: WireTask): OpsTask => ({
  id: w.id,
  subject: w.subjectKind,
  listingId: w.listingId,
  accountId: w.accountId,
  title: w.title,
  queue: w.queue,
  reasons: w.reasons,
  dueAt: w.dueAt,
  overdue: w.overdue,
  atMaster: w.level === 'master',
  categoryId: w.categoryId,
  claim: w.claim.state,
});

export type OpsStrike = {
  id: string;
  kind: WireStrike['kind'];
  status: WireStrike['status'];
  inForce: boolean;
  points: number;
  rule: string;
  issuedAt: string;
  expiresAt: string | null;
  appeal: 'pending' | 'won' | 'lost' | 'closed' | null;
};

const toStrike = (w: WireStrike): OpsStrike => ({
  id: w.id,
  kind: w.kind,
  status: w.status,
  inForce: w.inForce,
  points: w.points,
  rule: `${w.ruleCode} · ${w.ruleText}`,
  issuedAt: w.issuedAt,
  expiresAt: w.expiresAt,
  appeal: w.appeal?.status ?? null,
});

export type OpsReport = {
  id: string;
  severe: boolean;
  autoHidden: boolean;
  status: 'open' | 'upheld' | 'dismissed';
  reporterCount: number;
  /** Lượt báo theo loại; server không cho biết ai báo và không có lời mô tả tự do (TK 23). */
  categories: WireTaskDetail['reports'][number]['entries'][number]['category'][];
  lastAt: string;
};

export type OpsTaskDetail = OpsTask & {
  listing: {
    state: NonNullable<WireTaskDetail['listing']>['state'];
    title: string | null;
    description: string | null;
    price: number | null;
    negotiable: boolean;
    pictures: Picture[];
    groupName: string | null;
  } | null;
  listingDeleted: boolean;
  machine: { score: number | null; band: string | null; hits: string[] } | null;
  seller: {
    id: string;
    name: string | null;
    tier: string;
    cleanListings: number;
    strikesInForce: number;
  };
  duplicates: { accountId: string; name: string | null }[];
  sharedDevice: { accountId: string; name: string | null }[];
  escalationNote: string | null;
  reports: OpsReport[];
  strike: (OpsStrike & { statement: string | null }) | null;
  /** Đoạn hội thoại mà lượt báo trỏ tới — bằng chứng cho báo cáo gửi từ chat. */
  evidence: {
    id: string;
    sellerId: string;
    messages: { id: string; fromSeller: boolean; body: string; flagged: boolean; at: string }[];
  }[];
};

function toTaskDetail(w: WireTaskDetail): OpsTaskDetail {
  const l = w.listing;
  return {
    ...toTask(w),
    listing: l && {
      state: l.state,
      title: l.title,
      description: l.description,
      price: l.price,
      negotiable: l.negotiable,
      pictures: l.images.map((i) => ({ uri: i.url })),
      groupName: l.badge?.name ?? null,
    },
    listingDeleted: w.listingDeleted,
    machine: w.machine && { score: w.machine.score, band: w.machine.band, hits: w.machine.hits },
    seller: {
      id: w.seller.accountId,
      name: w.seller.displayName,
      tier: w.seller.tier,
      cleanListings: w.seller.cleanListings,
      strikesInForce: w.seller.strikes.filter((s) => s.inForce).length,
    },
    duplicates: w.duplicates.map((d) => ({ accountId: d.accountId, name: d.displayName })),
    sharedDevice: w.sharedDeviceAccounts.map((a) => ({
      accountId: a.accountId,
      name: a.displayName,
    })),
    escalationNote: w.escalation?.note ?? null,
    reports: w.reports.map((r) => ({
      id: r.reportId,
      severe: r.severe,
      autoHidden: r.autoHidden,
      status: r.status,
      reporterCount: r.reporterCount,
      categories: [...new Set(r.entries.map((e) => e.category))],
      lastAt: r.entries.reduce((max, e) => (e.reportedAt > max ? e.reportedAt : max), r.createdAt),
    })),
    strike: w.strike && { ...toStrike(w.strike), statement: w.strike.statement },
    evidence: w.conversations.map((c) => ({
      id: c.id,
      sellerId: c.sellerId,
      messages: c.messages.map((m) => ({
        id: m.id,
        fromSeller: m.senderId === c.sellerId,
        body: m.body,
        flagged: m.flagged,
        at: m.createdAt,
      })),
    })),
  };
}

/** Nhận định về máy khi cho đạt tin máy giữ — server bắt buộc, dùng để chỉnh luật máy (`/ops/review/stats/rules`). */
export type MachineJudgment = 'machine_right' | 'machine_overreach';

export const JUDGMENT_OPTIONS: { value: MachineJudgment; label: string; note: string }[] = [
  { value: 'machine_right', label: 'Máy giữ đúng', note: 'Đáng xem lại, nhưng tin không vi phạm' },
  {
    value: 'machine_overreach',
    label: 'Máy giữ quá tay',
    note: 'Tin bình thường — giúp chỉnh luật máy',
  },
];

/**
 * Một quyết định như người duyệt bấm. Map sang body của server ở `toDecisionBody` để màn hình không phải thuộc
 * luật ghép trường (`report.verdict` bắt buộc với việc có báo cáo, `machineJudgment` với tin máy giữ…).
 */
export type TaskDecision =
  | { kind: 'pass'; judgment?: MachineJudgment }
  | { kind: 'reject'; reasonTemplateId: string }
  | {
      kind: 'report';
      verdict: 'dismissed' | 'upheld';
      removeWith?: string;
      lockAccount?: boolean;
      judgment?: MachineJudgment;
    }
  | { kind: 'dismissEscalation'; note: string }
  | { kind: 'appeal'; verdict: 'won' | 'lost' };

/**
 * Bác báo cáo về tin máy đang giữ phải là "cho đạt" chứ không "giữ nguyên" (server: `OUTCOME_NOT_ALLOWED` — tin đang
 * chờ duyệt thì cho đạt hay từ chối). Báo cáo đúng kèm gỡ tin thì là "sai sót" với lý do mẫu.
 */
export function toDecisionBody(
  task: { reasons: readonly TaskReason[] },
  d: TaskDecision,
): WireDecision {
  switch (d.kind) {
    case 'pass':
      return { outcome: 'pass', ...(d.judgment && { machineJudgment: d.judgment }) };
    case 'reject':
      return { outcome: 'mistake', reasonTemplateId: d.reasonTemplateId };
    case 'dismissEscalation':
      return { outcome: 'dismiss', note: d.note };
    case 'appeal':
      return { outcome: 'keep', appeal: { verdict: d.verdict } };
    case 'report': {
      const report = { verdict: d.verdict, ...(d.lockAccount && { lockAccount: true }) };
      if (d.removeWith) return { outcome: 'mistake', reasonTemplateId: d.removeWith, report };
      if (d.verdict === 'dismissed' && task.reasons.includes('machine_hold')) {
        return { outcome: 'pass', ...(d.judgment && { machineJudgment: d.judgment }), report };
      }
      return { outcome: 'keep', report };
    }
  }
}

export type ReasonTemplate = { id: string; text: string; active: boolean };

/**
 * Một luật của máy duyệt. `signal` cộng điểm rủi ro; `gate` (cổng cứng) giữ tin và tính dò, chạy thử được nhưng không
 * tắt được; `quality` (chất lượng ảnh) giữ tin, không tính dò, tắt được. Chạy thử = máy chỉ ghi lại, không đổi kết quả.
 */
export type ScreeningRule = {
  code: WireRule['code'];
  label: string;
  kind: WireRule['kind'];
  weight: number;
  mode: WireRule['mode'];
};

const toRules = (rules: WireRule[]): ScreeningRule[] =>
  rules
    .map(({ code, label, kind, weight, mode }) => ({ code, label, kind, weight, mode }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

export type ReviewBoard = {
  open: number;
  queues: { queue: number; open: number; overdue: number }[];
  atMaster: { open: number; overdue: number };
};

/* ------------------------------ người & giấy tờ ------------------------------ */

export type IdCheck = {
  id: string;
  accountId: string;
  documentType: string;
  fullName: string;
  status: WireIdCheck['status'];
  submittedAt: string;
  reason: string | null;
};

const toIdCheck = (w: WireIdCheck): IdCheck => ({
  id: w.id,
  accountId: w.accountId,
  documentType: w.documentType,
  fullName: w.fullName,
  status: w.status,
  submittedAt: w.createdAt,
  reason: w.reason,
});

/* ------------------------------------ nhóm ------------------------------------ */

export type OpsGroupState = WireGroup['state'];
export type OpsGroupKind = WireGroup['kind'];
export type OpsGroupMode = WireGroup['mode'];

export const GROUP_STATE_LABEL: Record<OpsGroupState, string> = {
  pending_owner: 'Chờ giao chủ',
  active: 'Hoạt động',
  going_private: 'Đang chuyển riêng tư',
  ownerless: 'Thiếu chủ',
  locked: 'Tạm khoá',
  closed: 'Đã đóng',
};

export const GROUP_KIND_LABEL: Record<OpsGroupKind, string> = {
  school: 'Trường học',
  company: 'Công ty',
  community: 'Cộng đồng',
  other: 'Khác',
};

export const GROUP_MODE_LABEL: Record<OpsGroupMode, string> = {
  public_open: 'Công khai, vào tự do',
  public_review: 'Công khai, duyệt thành viên',
  private_code: 'Riêng tư, vào bằng mã',
  private_invite: 'Riêng tư, chỉ mời',
};

export type OpsGroup = {
  id: string;
  name: string;
  kind: OpsGroupKind;
  mode: OpsGroupMode;
  state: OpsGroupState;
  description: string | null;
  memberCount: number;
};

const toGroup = (w: WireGroup): OpsGroup => ({
  id: w.id,
  name: w.name,
  kind: w.kind,
  mode: w.mode,
  state: w.state,
  description: w.description,
  memberCount: w.memberCount,
});

export type OpsGroupDetail = OpsGroup & {
  code: string | null;
  lockedReason: string | null;
  ownerId: string | null;
  nomineeId: string | null;
  ownerlessSince: string | null;
  units: string[];
};

const toGroupDetail = (w: WireGroupDetail): OpsGroupDetail => ({
  ...toGroup(w),
  code: w.code,
  lockedReason: w.lockedReason,
  ownerId: w.ownerId,
  nomineeId: w.nomineeId,
  ownerlessSince: w.ownerlessSince,
  units: w.units.map((u) => u.name),
});

export type NewGroup = PostApiV1OpsGroupsData['body'];

/* ----------------------------------- hỗ trợ ----------------------------------- */

export type SupportThread = {
  id: string;
  personId: string | null;
  personName: string;
  /** Người dùng đã xoá tài khoản: đội vẫn đọc được, không gửi được. */
  gone: boolean;
  lastMessage: string | null;
  lastAt: string;
  unread: number;
  canSend: boolean;
};

const toThread = (w: WireSupport): SupportThread => ({
  id: w.id,
  personId: w.counterpart.accountId,
  personName: w.counterpart.displayName ?? 'Người dùng đã xoá tài khoản',
  gone: w.counterpart.gone,
  lastMessage: w.lastMessage?.body ?? null,
  lastAt: w.lastActivityAt,
  unread: w.unreadCount,
  canSend: w.canSend,
});

/** `fromTeam` = do một staff hỗ trợ viết (không nhất thiết là mình): `senderId` null là tin hệ thống. */
export type SupportMessage = {
  id: string;
  fromTeam: boolean;
  system: boolean;
  body: string;
  at: string;
};

const toSupportMessage =
  (personId: string | null) =>
  (w: WireSupportMessage): SupportMessage => ({
    id: w.id,
    fromTeam: w.senderId !== null && w.senderId !== personId,
    system: w.senderId === null,
    body: w.body,
    at: w.createdAt,
  });

/* ---------------------------------- danh mục ---------------------------------- */

export type RiskLevel = WireCategory['settings']['riskLevel'];

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'Rủi ro thấp',
  medium: 'Rủi ro vừa',
  high: 'Rủi ro cao',
};

export type OpsCategory = {
  id: string;
  name: string;
  active: boolean;
  templateVersion: number | null;
  riskLevel: RiskLevel;
  alwaysManual: boolean;
  groupReview: 'group' | 'platform';
  priceCap: number | null;
  settingsVersion: number;
};

const toCategory = (w: WireCategory): OpsCategory => ({
  id: w.id,
  name: w.name,
  active: w.status === 'active',
  templateVersion: w.templateVersion,
  riskLevel: w.settings.riskLevel,
  alwaysManual: w.settings.alwaysManual,
  groupReview: w.settings.groupReview,
  priceCap: w.settings.priceCap,
  settingsVersion: w.settings.version,
});

export type NewCategory = PostApiV1OpsCategoriesData['body'];

/* ------------------------------------- api ------------------------------------- */

export const opsApi = {
  board: async (): Promise<ReviewBoard> => {
    const d = await unwrap(getApiV1OpsReviewStatsBoard());
    return {
      open: d.open,
      queues: d.queues,
      atMaster: { open: d.atMaster.open, overdue: d.atMaster.overdue },
    };
  },

  tasks: async (queue: number | null, pageNo = 1): Promise<OpsPage<OpsTask>> =>
    page(
      await unwrap(
        getApiV1OpsReviewTasks({ query: { page: pageNo, ...(queue !== null && { queue }) } }),
      ),
      toTask,
    ),

  task: async (id: string): Promise<OpsTaskDetail> =>
    toTaskDetail(await unwrap(getApiV1OpsReviewTasksByTaskId({ path: { taskId: id } }))),

  /**
   * Nhận rồi quyết trong một lượt: server chỉ nhận quyết định của người đang giữ việc và so phiên bản tin lúc nhận
   * (`LISTING_CHANGED`). Nhận lại việc mình đang giữ chỉ gia hạn 10 phút, nên gọi lại không hại gì.
   */
  decide: async (task: Pick<OpsTask, 'id' | 'reasons'>, decision: TaskDecision): Promise<void> => {
    await unwrap(postApiV1OpsReviewTasksByTaskIdClaim({ path: { taskId: task.id } }));
    await unwrap(
      postApiV1OpsReviewTasksByTaskIdDecision({
        path: { taskId: task.id },
        body: toDecisionBody(task, decision),
      }),
    );
  },

  reasonTemplates: async (): Promise<ReasonTemplate[]> =>
    (await unwrap(getApiV1OpsReviewReasonTemplates()))
      .sort((a, b) => a.sort - b.sort)
      .map(({ id, text, active }) => ({ id, text, active })),

  addReasonTemplate: (text: string): Promise<unknown> =>
    unwrap(postApiV1OpsReviewReasonTemplates({ body: { text: text.trim() } })),

  setReasonTemplateActive: (id: string, active: boolean): Promise<unknown> =>
    unwrap(
      patchApiV1OpsReviewReasonTemplatesByTemplateId({
        path: { templateId: id },
        body: { active },
      }),
    ),

  /** Luật của phiên bản hiện hành (chỉ master); mỗi lần đổi là một phiên bản luật mới, có hiệu lực từ lượt gửi kế tiếp. */
  screeningRules: async (): Promise<ScreeningRule[]> =>
    toRules((await unwrap(getApiV1OpsScreeningRules())).rules),

  /** Server trả lại cả bộ luật sau khi đổi — dùng thẳng, không phải đọc lại. */
  setRuleMode: async ({
    code,
    mode,
  }: Pick<ScreeningRule, 'code' | 'mode'>): Promise<ScreeningRule[]> =>
    toRules(
      (await unwrap(patchApiV1OpsScreeningRulesByCode({ path: { code }, body: { mode } }))).rules,
    ),

  idChecks: async (status: IdCheck['status'] | null, pageNo = 1): Promise<OpsPage<IdCheck>> =>
    page(
      await unwrap(
        getApiV1OpsIdVerifications({ query: { page: pageNo, ...(status && { status }) } }),
      ),
      toIdCheck,
    ),

  decideIdCheck: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
    unwrap(
      postApiV1OpsIdVerificationsByIdDecision({
        path: { id },
        body: approve
          ? { status: 'verified' }
          : { status: 'rejected', reason: reason?.trim() ?? '' },
      }),
    ),

  strikes: async (accountId: string): Promise<OpsStrike[]> =>
    (await unwrap(getApiV1OpsTrustAccountsByAccountIdStrikes({ path: { accountId } }))).map(
      toStrike,
    ),

  lockAccount: ({ id, reason }: { id: string; reason: string }): Promise<void> =>
    unwrapEmpty(postApiV1OpsAccountsByIdLock({ path: { id }, body: { reason: reason.trim() } })),

  unlockAccount: (id: string): Promise<void> =>
    unwrapEmpty(postApiV1OpsAccountsByIdUnlock({ path: { id } })),

  groups: async (state: OpsGroupState | null, pageNo = 1): Promise<OpsPage<OpsGroup>> =>
    page(
      await unwrap(getApiV1OpsGroups({ query: { page: pageNo, ...(state && { state }) } })),
      toGroup,
    ),

  group: async (id: string): Promise<OpsGroupDetail> =>
    toGroupDetail(await unwrap(getApiV1OpsGroupsByGroupId({ path: { groupId: id } }))),

  createGroup: (g: NewGroup): Promise<unknown> =>
    unwrap(
      postApiV1OpsGroups({
        body: {
          ...g,
          name: g.name.trim(),
          ...(g.description?.trim() && { description: g.description.trim() }),
        },
      }),
    ),

  lockGroup: ({ id, reason }: { id: string; reason: string }): Promise<void> =>
    unwrapEmpty(
      postApiV1OpsGroupsByGroupIdLock({ path: { groupId: id }, body: { reason: reason.trim() } }),
    ),

  unlockGroup: (id: string): Promise<void> =>
    unwrapEmpty(postApiV1OpsGroupsByGroupIdUnlock({ path: { groupId: id } })),

  closeGroup: (id: string): Promise<void> =>
    unwrapEmpty(postApiV1OpsGroupsByGroupIdClose({ path: { groupId: id } })),

  supportQueue: async (pendingOnly: boolean, pageNo = 1): Promise<OpsPage<SupportThread>> =>
    page(
      await unwrap(
        getApiV1OpsSupportConversations({
          query: { page: pageNo, status: pendingOnly ? 'pending' : 'all' },
        }),
      ),
      toThread,
    ),

  /** Server trả tin mới trước; khung chat đọc từ trên xuống nên đảo lại ở đây. */
  supportThread: async (
    id: string,
  ): Promise<{ thread: SupportThread; messages: SupportMessage[] }> => {
    const path = { conversationId: id };
    const [head, list] = await Promise.all([
      unwrap(getApiV1OpsSupportConversationsByConversationId({ path })),
      unwrap(getApiV1OpsSupportConversationsByConversationIdMessages({ path })),
    ]);
    const thread = toThread(head);
    // Hermes chưa có `toReversed`; mảng vừa sinh từ `map` nên đảo tại chỗ không đụng dữ liệu của ai.
    // oxlint-disable-next-line unicorn/no-array-reverse
    return { thread, messages: list.items.map(toSupportMessage(thread.personId)).reverse() };
  },

  sendSupport: ({ id, body }: { id: string; body: string }): Promise<unknown> =>
    unwrap(
      postApiV1OpsSupportConversationsByConversationIdMessages({
        path: { conversationId: id },
        body: { body: body.trim() },
      }),
    ),

  markSupportRead: (id: string): Promise<void> =>
    unwrapEmpty(
      postApiV1OpsSupportConversationsByConversationIdRead({ path: { conversationId: id } }),
    ),

  categories: async (): Promise<OpsCategory[]> =>
    (await unwrap(getApiV1OpsCategories())).map(toCategory),

  createCategory: (c: NewCategory): Promise<unknown> =>
    unwrap(postApiV1OpsCategories({ body: { ...c, name: c.name.trim() } })),

  renameCategory: ({ id, name }: { id: string; name: string }): Promise<unknown> =>
    unwrap(patchApiV1OpsCategoriesById({ path: { id }, body: { name: name.trim() } })),

  setCategoryActive: ({ id, active }: { id: string; active: boolean }): Promise<unknown> =>
    unwrap(
      active
        ? postApiV1OpsCategoriesByIdEnable({ path: { id } })
        : postApiV1OpsCategoriesByIdDisable({ path: { id } }),
    ),
};
