import { unwrap, unwrapEmpty, type HelpTopic, type Picture, type TemplateField } from './client';
import {
  getApiV1OpsAccounts,
  getApiV1OpsAccountsById,
  getApiV1OpsCategories,
  getApiV1OpsFlagsByLookupCode,
  getApiV1OpsScreeningLookupsByCode,
  postApiV1OpsFlagsByLookupCodeClear,
  getApiV1OpsCategoriesByIdTemplateDraft,
  deleteApiV1OpsCategoriesByIdTemplateDraft,
  deleteApiV1OpsHelpTopicsById,
  getApiV1OpsGroups,
  getApiV1OpsGroupsByGroupId,
  getApiV1OpsIdVerifications,
  getApiV1OpsReviewReasonTemplates,
  getApiV1OpsReviewStatsBoard,
  getApiV1OpsScreeningStats,
  getApiV1OpsStatsDaily,
  getApiV1OpsReviewTasks,
  getApiV1OpsReviewTasksByTaskId,
  getApiV1OpsScreeningRules,
  getApiV1OpsStaff,
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
  postApiV1OpsHelpTopics,
  putApiV1OpsHelpOrder,
  putApiV1OpsHelpTopicsById,
  postApiV1OpsCategoriesByIdDisable,
  postApiV1OpsCategoriesByIdEnable,
  postApiV1OpsCategoriesByIdTemplatePublish,
  putApiV1OpsCategoriesByIdSettings,
  putApiV1OpsCategoriesByIdTemplateDraft,
  postApiV1OpsGroups,
  postApiV1OpsGroupsByGroupIdClose,
  postApiV1OpsGroupsByGroupIdLock,
  postApiV1OpsGroupsByGroupIdOwnerOffers,
  postApiV1OpsGroupsByGroupIdUnlock,
  postApiV1OpsIdVerificationsByIdDecision,
  postApiV1OpsReviewListingsByListingIdRemove,
  postApiV1OpsReviewListingsByListingIdRestore,
  postApiV1OpsReviewReasonTemplates,
  postApiV1OpsReviewTasksByTaskIdClaim,
  postApiV1OpsReviewTasksByTaskIdDecision,
  postApiV1OpsStaffByAccountIdRestore,
  putApiV1OpsStaffByAccountId,
  deleteApiV1OpsStaffByAccountId,
  postApiV1OpsSupportConversationsByConversationIdMessages,
  postApiV1OpsSupportConversationsByConversationIdRead,
} from './generated/sdk.gen';
import type {
  GetApiV1OpsAccountsResponses,
  GetApiV1OpsCategoriesResponses,
  GetApiV1OpsFlagsByLookupCodeResponses,
  GetApiV1OpsScreeningLookupsByCodeResponses,
  GetApiV1OpsGroupsByGroupIdResponses,
  GetApiV1OpsGroupsResponses,
  GetApiV1OpsIdVerificationsResponses,
  GetApiV1OpsReviewTasksByTaskIdResponses,
  GetApiV1OpsReviewTasksResponses,
  GetApiV1OpsScreeningRulesResponses,
  GetApiV1OpsStaffResponses,
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
type WireAccount = GetApiV1OpsAccountsResponses[200]['data']['items'][number];
type WireGroup = GetApiV1OpsGroupsResponses[200]['data']['items'][number];
type WireRule = GetApiV1OpsScreeningRulesResponses[200]['data']['rules'][number];
type WireGroupDetail = GetApiV1OpsGroupsByGroupIdResponses[200]['data'];
type WireSupport = GetApiV1OpsSupportConversationsResponses[200]['data']['items'][number];
type WireSupportMessage =
  GetApiV1OpsSupportConversationsByConversationIdMessagesResponses[200]['data']['items'][number];
type WireCategory = GetApiV1OpsCategoriesResponses[200]['data'][number];
type WireDecision = PostApiV1OpsReviewTasksByTaskIdDecisionData['body'];
type WireStaff = GetApiV1OpsStaffResponses[200]['data'][number];
type WireHold = GetApiV1OpsScreeningLookupsByCodeResponses[200]['data'];
type WireFlag = GetApiV1OpsFlagsByLookupCodeResponses[200]['data'];

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

export const toTask = (w: WireTask): OpsTask => ({
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
    messages: {
      id: string;
      fromSeller: boolean;
      body: string;
      photos: Picture[];
      flagged: boolean;
      at: string;
    }[];
  }[];
};

export function toTaskDetail(w: WireTaskDetail): OpsTaskDetail {
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
        photos: m.images.map((img) => ({ uri: img.url })),
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
  | { kind: 'appeal'; verdict: 'won' | 'lost' }
  /** Chỉ tin trong nhóm; kèm "trái quy định sàn" + lý do thì server sinh việc hàng 4 cho staff (spec group-escalation). */
  | { kind: 'detach'; platformViolation: boolean; note?: string };

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
    case 'detach':
      return d.platformViolation
        ? { outcome: 'detach', platformViolation: true, note: d.note }
        : { outcome: 'detach' };
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

/** Một ngày Việt Nam trên bảng số của master (`/ops/stats/daily`); `day` là `YYYY-MM-DD`. */
/** Số liệu máy một tháng (ghim-server add-screening-stats); tháng không có lượt đã là số 0 từ server. */
export type MachineMonth = {
  month: string;
  runs: number;
  passFull: number;
  passLimited: number;
  hold: number;
  low: number;
  medium: number;
  high: number;
};

export type MachineStats = {
  /** Cũ trước, đủ số tháng đã xin. */
  months: MachineMonth[];
  topRules: { code: string; label: string; runs: number }[];
};

/** Chủ đề trợ giúp như master gửi lên — chưa có mã. */
export type HelpTopicInput = Omit<HelpTopic, 'id'>;

export type DayStats = {
  day: string;
  newAccounts: number;
  submissions: number;
  firstLive: number;
  machine: { passFull: number; passLimited: number; hold: number };
  decisions: { passed: number; rejected: number };
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

export type OpsAccountStatus = WireAccount['status'];

/** Một dòng danh bạ (`/ops/accounts`): có email vì hỗ trợ cần đối chiếu thư; không dấu băm, không mã máy. */
export type OpsAccount = {
  id: string;
  displayName: string;
  email: string;
  role: WireAccount['role'];
  status: OpsAccountStatus;
  createdAt: string;
  lockedAt: string | null;
  lockedReason: string | null;
  tier: WireAccount['tier'];
  /** Đang có cảnh cáo tính điểm. */
  struck: boolean;
};

export type OpsAccountCard = OpsAccount & { strikePoints: number };

const toAccount = (w: WireAccount): OpsAccount => ({
  id: w.id,
  displayName: w.displayName,
  email: w.email,
  role: w.role,
  status: w.status,
  createdAt: w.createdAt,
  lockedAt: w.lockedAt,
  lockedReason: w.lockedReason,
  tier: w.tier,
  struck: w.struck,
});

const toIdCheck = (w: WireIdCheck): IdCheck => ({
  id: w.id,
  accountId: w.accountId,
  documentType: w.documentType,
  fullName: w.fullName,
  status: w.status,
  submittedAt: w.createdAt,
  reason: w.reason,
});

/* ------------------------------------ tra mã ----------------------------------- */

/**
 * Mã người dùng đọc lại qua điện thoại hay gõ tay: bỏ khoảng trắng và gạch nối, viết hoa — I/L/O lẫn với 1/0 thì server
 * tự đổi (`normalizeLookupCode` bên server), app không đổi để mã hiện ra đúng như người dùng gõ.
 */
export const normalizeLookupCode = (text: string): string =>
  text.replace(/[\s-]+/g, '').toUpperCase();

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Mã tin trong chữ người dùng dán vào: mã trơn hay đường dẫn có mã. Không thấy mã thì `null`. */
export const listingIdIn = (text: string): string | null =>
  text.match(UUID)?.[0]?.toLowerCase() ?? null;

export const HOLD_OUTCOME_LABEL: Record<WireHold['outcome'], string> = {
  pass_full: 'Cho lên đủ',
  pass_limited: 'Cho lên, hạn chế hiển thị',
  hold: 'Giữ chờ người duyệt',
};

export const HOLD_CAUSE_LABEL: Record<WireHold['cause'], string> = {
  score: 'Điểm rủi ro',
  gate: 'Cổng cứng',
  image_quality: 'Chất lượng ảnh',
  always_manual: 'Danh mục luôn duyệt tay',
  device: 'Đánh dấu theo thiết bị',
  error: 'Máy lỗi',
  timeout: 'Máy quá giờ',
};

/** Chữ của server (`screening/ops/lookup.service`) — màn tra đánh dấu không có nhãn đi kèm như màn tra lần giữ. */
export const FLAG_KIND_LABEL: Record<WireFlag['kind'], string> = {
  many_accounts_on_device: 'Nhiều tài khoản trên một máy',
  device_of_locked_account: 'Dùng máy của tài khoản bị khoá',
  device_of_struck_account: 'Dùng máy của tài khoản có cảnh cáo',
};

/** Một lần máy giữ theo mã tra cứu: lý do cụ thể, không bao giờ có dấu thiết bị (TK 8, TK 13). */
export type HoldLookup = {
  code: string;
  listingId: string;
  accountId: string;
  decidedAt: string;
  outcome: WireHold['outcome'];
  cause: WireHold['cause'];
  score: number | null;
  band: WireHold['band'];
  tier: WireHold['tier'];
  hits: { code: string; label: string; weight: number; trial: boolean; phrases: string[] }[];
  /** Đánh dấu đang mở kèm mã của nó — tra tiếp để gỡ khi đúng là nhầm (vd máy mua lại). */
  deviceFlags: { label: string; flagCode: string | null }[];
};

export type DeviceFlag = {
  code: string;
  kind: WireFlag['kind'];
  accountId: string;
  /** Tài khoản bị khoá / có cảnh cáo đã dùng chung máy; null với "nhiều tài khoản trên một máy". */
  relatedAccountId: string | null;
  createdAt: string;
  clearedAt: string | null;
  clearedReason: string | null;
};

const toHold = (w: WireHold): HoldLookup => ({
  code: w.lookupCode,
  listingId: w.listingId,
  accountId: w.accountId,
  decidedAt: w.decidedAt,
  outcome: w.outcome,
  cause: w.cause,
  score: w.score,
  band: w.band,
  tier: w.tier,
  hits: w.hits.map((h) => ({
    code: h.code,
    label: h.label,
    weight: h.weight,
    trial: h.mode === 'trial',
    phrases: h.phrases.map((p) => p.text),
  })),
  deviceFlags: w.deviceFlags.map((f) => ({ label: f.label, flagCode: f.flagLookupCode })),
});

const toFlag = (w: WireFlag): DeviceFlag => ({
  code: w.lookupCode,
  kind: w.kind,
  accountId: w.accountId,
  relatedAccountId: w.relatedAccountId,
  createdAt: w.createdAt,
  clearedAt: w.clearedAt,
  clearedReason: w.clearedReason,
});

/* ------------------------------------ staff ----------------------------------- */

export type StaffScope = WireStaff['scopes'][number];

/** Ba việc toàn hệ thống — ngoài danh mục (spec staff-permissions). */
export const STAFF_SCOPE_LABEL: Record<StaffScope, string> = {
  support: 'Hỗ trợ người dùng',
  user_reports: 'Báo cáo về người',
  id_verification: 'Duyệt giấy tờ xác minh',
};

export type StaffScopeInput = { scopes: StaffScope[]; categoryIds: string[] };

export type OpsStaff = StaffScopeInput & {
  accountId: string;
  /** Tự treo khi tài khoản bị khoá hay nhận gậy; chỉ master trả lại. */
  suspended: boolean;
  suspendedReason: string | null;
  grantedAt: string;
};

const toStaff = (w: WireStaff): OpsStaff => ({
  accountId: w.accountId,
  scopes: w.scopes,
  categoryIds: w.categoryIds,
  suspended: w.status === 'suspended',
  suspendedReason: w.suspendedReason,
  grantedAt: w.grantedAt,
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

/** Trạng thái master giao chủ được (ghim-server `ASSIGNABLE`): mọi trạng thái trừ đã đóng và đang chuyển riêng tư. */
export const OWNER_ASSIGNABLE: ReadonlySet<OpsGroupState> = new Set([
  'pending_owner',
  'active',
  'ownerless',
  'locked',
]);

export const GROUP_KIND_LABEL: Record<OpsGroupKind, string> = {
  school: 'Trường học',
  company: 'Công ty',
  community: 'Cộng đồng',
  other: 'Khác',
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
  lastMessage: w.lastMessage && (w.lastMessage.body || `Đã gửi ${w.lastMessage.images.length} ảnh`),
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
  /** Người dùng gửi ảnh cho đội được (add-message-images); đội trả lời chỉ bằng chữ. */
  photos: Picture[];
  at: string;
};

const toSupportMessage =
  (personId: string | null) =>
  (w: WireSupportMessage): SupportMessage => ({
    id: w.id,
    fromTeam: w.senderId !== null && w.senderId !== personId,
    system: w.senderId === null,
    body: w.body,
    photos: w.images.map((img) => ({ uri: img.url })),
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
  referencePrice: number | null;
  settingsVersion: number;
};

/** Năm cài đặt máy duyệt của danh mục — mỗi lần lưu là một phiên bản cài đặt mới (spec category-catalog). */
export type CategorySettings = Pick<
  OpsCategory,
  'priceCap' | 'referencePrice' | 'riskLevel' | 'alwaysManual' | 'groupReview'
>;

/** `draftVersion` 0 = chưa có bản nháp; khi đó `fields` là mẫu hiện hành để sửa tiếp (server). */
export type TemplateDraft = {
  draftVersion: number;
  fields: TemplateField[];
  updatedAt: string | null;
};

export const FIELD_TYPE_LABEL: Record<TemplateField['type'], string> = {
  text: 'Chữ',
  number: 'Số',
  single_choice: 'Chọn một',
  multi_choice: 'Chọn nhiều',
};

export const isChoiceField = (type: TemplateField['type']): boolean =>
  type === 'single_choice' || type === 'multi_choice';

/** Trần của server (`TEMPLATE_FIELDS_MAX`). */
export const TEMPLATE_FIELDS_MAX = 40;
const FIELD_NAME = /^[a-z0-9_]{1,40}$/;

/** Tên mục gợi ý từ nhãn: bỏ dấu, chữ thường, gạch dưới — đúng dạng server nhận. Tên dùng để lọc, người dùng không thấy. */
export function fieldNameOf(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * Lỗi đầu tiên của bản nháp theo đúng luật server kiểm (`category.schema`) — báo trước khi gửi thay vì nhận 400 chung.
 * Luật khoá tên mục đã phát hành chỉ server biết (mọi phiên bản cũ), nên vẫn có thể nhận 409 `TEMPLATE_FIELD_NAME_LOCKED`.
 */
export function templateIssue(fields: readonly TemplateField[]): string | null {
  if (fields.length > TEMPLATE_FIELDS_MAX) return `Mẫu có tối đa ${TEMPLATE_FIELDS_MAX} mục`;
  const seen = new Set<string>();
  for (const [i, f] of fields.entries()) {
    const at = `Mục ${i + 1}`;
    if (!f.label.trim()) return `${at}: thiếu nhãn`;
    if (!FIELD_NAME.test(f.name)) return `${at}: tên chỉ gồm chữ thường không dấu, số, gạch dưới`;
    if (seen.has(f.name)) return `${at}: tên "${f.name}" trùng mục khác`;
    seen.add(f.name);
    if (isChoiceField(f.type) && f.options.length === 0)
      return `${at}: mục chọn cần ít nhất một lựa chọn`;
  }
  return null;
}

/** Server từ chối `options` ở mục chữ / số, và đòi có ở mục chọn. */
const toWireField = ({ options, ...f }: TemplateField) =>
  isChoiceField(f.type) ? { ...f, options } : f;

const toCategory = (w: WireCategory): OpsCategory => ({
  id: w.id,
  name: w.name,
  active: w.status === 'active',
  templateVersion: w.templateVersion,
  riskLevel: w.settings.riskLevel,
  alwaysManual: w.settings.alwaysManual,
  groupReview: w.settings.groupReview,
  priceCap: w.settings.priceCap,
  referencePrice: w.settings.referencePrice,
  settingsVersion: w.settings.version,
});

export type NewCategory = PostApiV1OpsCategoriesData['body'];

/* ------------------------------------- api ------------------------------------- */

export const opsApi = {
  /** Hôm nay trước, kể cả hôm nay đang dở; server đã điền 0 cho ngày trống. */
  dailyStats: async (days: number): Promise<DayStats[]> =>
    (await unwrap(getApiV1OpsStatsDaily({ query: { days } }))).days,

  machineStats: (months: number): Promise<MachineStats> =>
    unwrap(getApiV1OpsScreeningStats({ query: { months } })),

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

  /** Gửi cả chủ đề một lượt; chủ đề mới đứng cuối danh sách. */
  createHelpTopic: (topic: HelpTopicInput): Promise<HelpTopic> =>
    unwrap(postApiV1OpsHelpTopics({ body: topic })),

  updateHelpTopic: (id: string, topic: HelpTopicInput): Promise<HelpTopic> =>
    unwrap(putApiV1OpsHelpTopicsById({ path: { id }, body: topic })),

  deleteHelpTopic: (id: string): Promise<void> =>
    unwrapEmpty(deleteApiV1OpsHelpTopicsById({ path: { id } })),

  /** Mã mọi chủ đề theo thứ tự mới; danh sách vừa đổi ở nơi khác thì server trả 409 kèm câu báo. */
  reorderHelpTopics: (ids: string[]): Promise<void> =>
    unwrapEmpty(putApiV1OpsHelpOrder({ body: { ids } })),

  /**
   * Gỡ thẳng một tin sàn đang hiện, mức "sai sót" kèm lý do mẫu đang bật — không qua việc. Server chặn: staff khác danh
   * mục (403), tin trong nhóm (409 `OUTCOME_NOT_ALLOWED`), tin đang có việc mở (409 `TASK_OPEN`, phải xử qua việc).
   */
  removeListing: async ({
    id,
    reasonTemplateId,
  }: {
    id: string;
    reasonTemplateId: string;
  }): Promise<void> => {
    await unwrap(
      postApiV1OpsReviewListingsByListingIdRemove({
        path: { listingId: id },
        body: { reasonTemplateId },
      }),
    );
  },

  /** Tin sàn đang bị gỡ hiện lại, ngày hiển thị chạy tiếp từ chỗ đã dừng; tin không bị gỡ: 409 `INVALID_TRANSITION`. */
  restoreListing: async (id: string): Promise<void> => {
    await unwrap(postApiV1OpsReviewListingsByListingIdRestore({ path: { listingId: id } }));
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

  /** Danh bạ cho master và staff hỗ trợ: `q` khớp tên đúng dấu hay email; vai khác server trả 403. */
  accounts: async (
    q: string,
    status: OpsAccountStatus | null,
    pageNo = 1,
  ): Promise<OpsPage<OpsAccount>> =>
    page(
      await unwrap(
        getApiV1OpsAccounts({
          query: { page: pageNo, ...(q && { q }), ...(status && { status }) },
        }),
      ),
      toAccount,
    ),

  account: async (id: string): Promise<OpsAccountCard> => {
    const w = await unwrap(getApiV1OpsAccountsById({ path: { id } }));
    return { ...toAccount(w), strikePoints: w.strikePoints };
  },

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

  /**
   * Master giao chủ — lần đầu, nhóm thiếu chủ, hay giao đè (lời giao / lời chuyển đang chờ bị huỷ). Người nhận đồng ý
   * trong 14 ngày; mức tin cậy xét lúc họ đồng ý, không lúc giao. Người không đủ điều kiện: 409 `GROUP_ROLE_INELIGIBLE`.
   */
  offerGroupOwner: async ({ id, accountId }: { id: string; accountId: string }): Promise<void> => {
    await unwrap(
      postApiV1OpsGroupsByGroupIdOwnerOffers({ path: { groupId: id }, body: { accountId } }),
    );
  },

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

  /** Master hay staff có việc hỗ trợ; người khác (kể cả người đăng) nhận 403. Mã không có thì 404. */
  holdLookup: async (code: string): Promise<HoldLookup> =>
    toHold(await unwrap(getApiV1OpsScreeningLookupsByCode({ path: { code } }))),

  flag: async (code: string): Promise<DeviceFlag> =>
    toFlag(await unwrap(getApiV1OpsFlagsByLookupCode({ path: { lookupCode: code } }))),

  /** Gỡ khi đúng là nhầm, kèm lý do; staff không gỡ được đánh dấu trên chính tài khoản mình (403). */
  clearFlag: (code: string, reason: string): Promise<void> =>
    unwrapEmpty(
      postApiV1OpsFlagsByLookupCodeClear({ path: { lookupCode: code }, body: { reason } }),
    ),

  /** Gửi đủ năm cài đặt — server tạo phiên bản cài đặt kế tiếp; kết quả máy cũ vẫn trỏ bản nó đã dùng. */
  setCategorySettings: (id: string, s: CategorySettings): Promise<unknown> =>
    unwrap(putApiV1OpsCategoriesByIdSettings({ path: { id }, body: s })),

  templateDraft: async (id: string): Promise<TemplateDraft> => {
    const d = await unwrap(getApiV1OpsCategoriesByIdTemplateDraft({ path: { id } }));
    return {
      draftVersion: d.draftVersion,
      fields: d.fields.map((f) => ({ ...f, options: f.options ?? [] })),
      updatedAt: d.updatedAt,
    };
  },

  /** Khoá lạc quan: người khác đã lưu sau `baseDraftVersion` thì server trả 409 — tải lại rồi sửa tiếp. */
  saveTemplateDraft: async (
    id: string,
    baseDraftVersion: number,
    fields: TemplateField[],
  ): Promise<number> =>
    (
      await unwrap(
        putApiV1OpsCategoriesByIdTemplateDraft({
          path: { id },
          body: { baseDraftVersion, fields: fields.map(toWireField) },
        }),
      )
    ).draftVersion,

  discardTemplateDraft: (id: string): Promise<void> =>
    unwrapEmpty(deleteApiV1OpsCategoriesByIdTemplateDraft({ path: { id } })),

  /** Bản nháp thành phiên bản mẫu kế, bất biến từ đó; tin mới điền theo nó. Trả số phiên bản. */
  publishTemplate: async (id: string): Promise<number | null> =>
    (await unwrap(postApiV1OpsCategoriesByIdTemplatePublish({ path: { id } }))).version,

  /** Server chỉ trả mã tài khoản — tên lấy từ thẻ tài khoản (`account`), staff thường chỉ vài người. */
  staff: async (categoryId: string | null): Promise<OpsStaff[]> =>
    (await unwrap(getApiV1OpsStaff({ query: categoryId ? { categoryId } : {} }))).map(toStaff),

  /** Gửi TRỌN phạm vi: thiếu danh mục nào là thu danh mục đó (spec staff-permissions). Rỗng cả hai thì server từ chối. */
  setStaff: async (accountId: string, scope: StaffScopeInput): Promise<OpsStaff> =>
    toStaff(await unwrap(putApiV1OpsStaffByAccountId({ path: { accountId }, body: scope }))),

  /** Có hiệu lực ngay — việc người đó đang nhận trả về hàng chờ. */
  revokeStaff: (accountId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1OpsStaffByAccountId({ path: { accountId } })),

  /** Trả đúng phạm vi lúc treo; tài khoản còn khoá thì server từ chối. */
  restoreStaff: async (accountId: string): Promise<OpsStaff> =>
    toStaff(await unwrap(postApiV1OpsStaffByAccountIdRestore({ path: { accountId } }))),
};
