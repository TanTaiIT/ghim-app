import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  deleteApiV1GroupsByGroupIdJoinRequest,
  deleteApiV1ListingsById,
  deleteApiV1Me,
  deleteApiV1MeAvatar,
  deleteApiV1MeBlocksByAccountId,
  deleteApiV1MeConversationsByConversationId,
  deleteApiV1MeConversationsByConversationIdViewing,
  deleteApiV1MeGroupMutesByGroupId,
  deleteApiV1MeSavedListingsByListingId,
  deleteApiV1MeSessions,
  deleteApiV1MeSessionsById,
  getApiV1Categories,
  getApiV1CategoriesByIdTemplate,
  getApiV1CategoriesByIdTemplateVersionsByVersion,
  getApiV1Groups,
  getApiV1GroupsByGroupId,
  getApiV1GroupsByGroupIdAnnouncements,
  getApiV1GroupsByGroupIdListings,
  getApiV1GroupsByGroupIdMembers,
  getApiV1Listings,
  getApiV1ListingsById,
  getApiV1ListingsByIdSuggestions,
  getApiV1Me,
  getApiV1MeBlocks,
  getApiV1MeConversations,
  getApiV1MeConversationsByConversationId,
  getApiV1MeConversationsByConversationIdMessages,
  getApiV1MeGroupInvitations,
  getApiV1MeGroups,
  getApiV1MeListings,
  getApiV1MeNotificationPreferences,
  postApiV1MeIdVerification,
  putApiV1MeNotificationPreferencesByCategory,
  postApiV1MeEmailChangeConfirm,
  postApiV1MeEmailChange,
  postApiV1MeBlocks,
  getApiV1MeReports,
  getApiV1MeNotifications,
  getApiV1MeNotificationsUnreadCount,
  getApiV1MeIdVerification,
  getApiV1MeSavedListings,
  getApiV1MeSavedListingsIds,
  getApiV1MeSessions,
  getApiV1MeTrust,
  getApiV1RegionsProvinces,
  getApiV1RegionsProvincesByCodeWards,
  getApiV1UsersById,
  getApiV1UsersByIdListings,
  getHealthReady,
  patchApiV1ListingsById,
  patchApiV1Me,
  postApiV1AuthForgotPassword,
  postApiV1AuthLogin,
  postApiV1AuthLogout,
  postApiV1AuthRefresh,
  postApiV1AuthRegister,
  postApiV1AuthResendCode,
  postApiV1AuthResetPassword,
  postApiV1AuthVerifyEmail,
  postApiV1GroupInvitationsByIdAccept,
  postApiV1GroupInvitationsByIdDecline,
  postApiV1GroupsByGroupIdConversation,
  postApiV1GroupsByGroupIdJoin,
  postApiV1GroupsByGroupIdLeave,
  postApiV1GroupsLookupCode,
  postApiV1Listings,
  postApiV1ListingsByIdMoveToMarketplace,
  postApiV1ListingsByIdRenew,
  postApiV1ListingsByIdSold,
  postApiV1ListingsByIdSubmit,
  postApiV1ListingsByIdWithdraw,
  postApiV1ListingsByListingIdConversation,
  postApiV1MeConversationsByConversationIdMessages,
  postApiV1MeConversationsByConversationIdOffers,
  postApiV1MeConversationsByConversationIdOffersByMessageIdAccept,
  postApiV1MeConversationsByConversationIdOffersByMessageIdDecline,
  postApiV1MeConversationsByConversationIdRead,
  postApiV1MeConversationsByConversationIdReports,
  postApiV1MediaUploads,
  postApiV1MeNotificationsRead,
  postApiV1MeStrikesByStrikeIdAppeal,
  postApiV1MeSupportConversation,
  postApiV1Reports,
  putApiV1MeAvatar,
  putApiV1MeConversationsByConversationIdViewing,
  putApiV1MeGroupMutesByGroupId,
  putApiV1MePassword,
  putApiV1MeSavedListingsByListingId,
} from './generated/sdk.gen';
import type {
  GetApiV1GroupsByGroupIdResponses,
  GetApiV1GroupsResponses,
  GetApiV1ListingsByIdResponses,
  GetApiV1ListingsResponses,
  GetApiV1MeConversationsByConversationIdMessagesResponses,
  GetApiV1MeConversationsByConversationIdResponses,
  GetApiV1MeGroupsResponses,
  GetApiV1MeIdVerificationResponses,
  GetApiV1MeNotificationsResponses,
  GetApiV1MeResponses,
  GetApiV1MeTrustResponses,
  GetApiV1UsersByIdResponses,
} from './generated/types.gen';
import { ApiError, deviceHeaders } from './http';
import { formatVnd } from '@/utils/format';

/*
 * Lớp gọi dữ liệu DUY NHẤT của app (HARD#20): mọi hàm ở đây gọi SDK trong `./generated` và đi qua
 * `unwrap`. Domain type khai ngay đây; kiểu wire của `types.gen.ts` không rò lên `queries/` hay `app/`.
 */

/** Vỏ response của ghim-server: `{ success, data | error }`. */
type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

/** Hình dạng kết quả SDK (hey-api, chế độ không throw): dữ liệu hoặc lỗi, kèm response thô. */
type SdkResult<TData> = { data?: TData; error?: unknown; response?: Response };

function isEnvelope(value: unknown): value is Envelope<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value;
}

/**
 * `ApiError` có sẵn là lỗi của lượt làm mới phiên trong `http.ts` (SDK bắt mọi thứ `fetch` ném rồi trả ở
 * `error`) — giữ nguyên để người dùng thấy "phiên đã hết hạn" chứ không phải "mất mạng". Không có vỏ nghĩa
 * là chưa tới được server: mạng đứt, proxy trả HTML, server chết giữa chừng.
 */
function toApiError(body: unknown, response: Response | undefined): ApiError {
  if (body instanceof ApiError) return body;
  if (isEnvelope(body) && !body.success) {
    return new ApiError(
      body.error.code,
      body.error.message,
      response?.status ?? 0,
      body.error.details,
    );
  }
  return new ApiError(
    'NETWORK_ERROR',
    'Không kết nối được tới máy chủ, kiểm tra mạng rồi thử lại',
    response?.status ?? 0,
  );
}

/**
 * Chỗ duy nhất bóc vỏ response và đổi mọi nhánh hỏng thành `ApiError`.
 *
 * SDK không throw mà trả `{ data, error }`; backend lại trả vỏ ở CẢ hai nhánh (503 của readiness vẫn là
 * `success: true`). Đọc `data ?? error` rồi phân nhánh theo `success` là cách duy nhất không bỏ sót nhánh
 * nào.
 */
export async function unwrap<T>(call: Promise<SdkResult<{ success: true; data: T }>>): Promise<T> {
  const { data, error, response } = await call;
  const body: unknown = data ?? error;
  if (isEnvelope(body) && body.success) return body.data as T;
  throw toApiError(body, response);
}

/** Endpoint trả 204 không có vỏ để bóc: thành công là response 2xx; thất bại vẫn mang vỏ lỗi như mọi chỗ. */
export async function unwrapEmpty(call: Promise<SdkResult<unknown>>): Promise<void> {
  const { error, response } = await call;
  if (error === undefined && response?.ok) return;
  throw toApiError(error, response);
}

/* ------------------------------- domain type ------------------------------- */

export type Readiness = { database: 'up' | 'down' };

/*
 * Các type dưới đây là hợp đồng mà màn hình đang dùng với dữ liệu mẫu (`./mock`). Khi ghim-server mở
 * `add-listings` / `add-groups` / `add-messaging`, mapper wire → domain ở file này phải trả đúng hình
 * dạng này để màn hình không đổi.
 */

export type Picture = { uri: string };

export const CONDITIONS = ['new', 'like-new', 'used'] as const;

export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'Mới',
  'like-new': 'Như mới',
  used: 'Đã dùng',
};

/** Năm loại cố định của server (TK 23): server thống kê theo loại, nên app không tự đặt thêm lý do nào. */
export const REPORT_CATEGORIES = [
  'fraud',
  'misinformation',
  'harassment',
  'prohibited',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** Loại giấy tờ người dùng chọn — server nhận chữ tự do, app đưa sẵn ba loại hay gặp. */
export type IdDocumentType = 'CCCD' | 'CMND' | 'Hộ chiếu';

export const ID_DOCUMENT_TYPES: { value: IdDocumentType; label: string; digits: number | null }[] =
  [
    { value: 'CCCD', label: 'Căn cước công dân', digits: 12 },
    { value: 'CMND', label: 'Chứng minh nhân dân', digits: 9 },
    { value: 'Hộ chiếu', label: 'Hộ chiếu', digits: null },
  ];

/**
 * Số giấy tờ gõ sai dạng thì báo ngay, khỏi chờ người duyệt từ chối: CCCD 12 số, CMND 9 số; hộ chiếu theo luật server
 * (4–40 ký tự). null = hợp lệ.
 */
export function idNumberIssue(type: IdDocumentType, number: string): string | null {
  const value = number.trim();
  const digits = ID_DOCUMENT_TYPES.find((t) => t.value === type)?.digits ?? null;
  if (digits !== null) {
    return /^\d+$/.test(value) && value.length === digits
      ? null
      : `${type} gồm đúng ${digits} chữ số`;
  }
  return value.length >= 4 && value.length <= 40 ? null : 'Số hộ chiếu từ 4 đến 40 ký tự';
}

/**
 * Hồ sơ xác minh gần nhất — không có số giấy tờ: server không trả lại số cho ai, kể cả người nộp (TK 27 cam kết 32), và
 * không nêu ai duyệt.
 */
export type IdSubmission = {
  documentType: string;
  fullName: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reason: string | null;
};

type WireIdVerification = NonNullable<GetApiV1MeIdVerificationResponses[200]['data']>;

function toIdSubmission(w: WireIdVerification): IdSubmission {
  return {
    documentType: w.documentType,
    fullName: w.fullName,
    status: w.status,
    submittedAt: w.createdAt,
    reviewedAt: w.reviewedAt,
    reason: w.reason,
  };
}

/** Báo cáo mình đã gửi: server không trả tiêu đề tin hay tên người — chỉ mã để mở lại (không lộ gì thêm cho người báo). */
export type MyReport = {
  id: string;
  subject: { kind: 'listing' | 'account'; id: string } | null;
  category: ReportCategory;
  status: 'open' | 'upheld' | 'dismissed';
  reportedAt: string;
  decidedAt: string | null;
};

/** Chín nhóm thông báo (spec notification/preferences); "tài khoản" luôn bật. */
export type NotificationCategory =
  | 'messages'
  | 'your_listings'
  | 'your_groups'
  | 'your_reports'
  | 'account'
  | 'trust_strikes'
  | 'group_announcements'
  | 'group_new_listings'
  | 'support';

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  messages: 'Tin nhắn',
  your_listings: 'Tin đăng của bạn',
  your_groups: 'Nhóm của bạn',
  your_reports: 'Báo cáo bạn đã gửi',
  account: 'Tài khoản',
  trust_strikes: 'Mức tin cậy và cảnh cáo',
  group_announcements: 'Thông báo của nhóm',
  group_new_listings: 'Tin mới trong nhóm',
  support: 'Hỗ trợ Ghim',
};

export const ALWAYS_ON_NOTIFICATIONS: ReadonlySet<NotificationCategory> = new Set(['account']);

export type NotificationPref = { category: NotificationCategory; enabled: boolean };

export const REPORT_CATEGORY_LABEL: Record<ReportCategory, string> = {
  fraud: 'Có dấu hiệu lừa đảo',
  misinformation: 'Ảnh hoặc thông tin không thật',
  harassment: 'Quấy rối, xúc phạm',
  prohibited: 'Hàng cấm mua bán',
  other: 'Lý do khác',
};

/** Danh mục của server: uuid do master tạo lúc chạy — không có bộ khoá cố định nào để app dựa vào. */
export type Category = { id: string; name: string };

/** Hai cấp như dữ liệu hành chính từ 01/07/2025 mà server dùng: phường/xã thuộc tỉnh/thành. */
export type Place = { ward: string | null; province: string };

export type Province = { code: number; name: string };
export type Ward = { code: number; name: string };

/** Khu vực khi chưa biết người dùng ở đâu (khách, tài khoản chưa đặt khu vực). */
export const DEFAULT_CITY = 'TP.HCM';

export type Person = { id: string; name: string; verified: boolean };

export type ListingCard = {
  id: string;
  title: string;
  price: number;
  cover: Picture;
  place: Place;
  postedAt: string;
  boosted: boolean;
  /** null khi danh sách của server chỉ mang `ownerId` — hồ sơ người bán chỉ tải ở màn chi tiết. */
  seller: Person | null;
  /** Nhóm mà tin được đăng vào — mục "Gần bạn" gắn nhãn để người xem biết tin đến từ đâu. */
  groupName: string | null;
  /**
   * Tin đã bán hay hết hạn: chỉ mở được bằng đường link và còn trong "Đã lưu" (TK 15) — mọi danh sách khác chỉ có tin
   * đang hiển thị, nên ở đó luôn null. Không mở được hội thoại mới hay trả giá.
   */
  ended: 'sold' | 'expired' | null;
};

/*
 * Các trường nullable dưới đây là thứ thiết kế có mà server chưa trả (đánh giá, số giao dịch, thời gian phản
 * hồi, tình trạng, lượt xem): màn hình ẩn phần đó khi null thay vì bịa số. Dữ liệu mẫu vẫn điền đủ.
 */

export type Seller = Person & {
  rating: number | null;
  deals: number | null;
  replyMinutes: number | null;
  /** Chỉ có khi người bán bật hiện số trên tin (`showPhone`); chưa xác minh. */
  phone: string | null;
  joinedAt: string | null;
};

export type ListingDetail = Omit<ListingCard, 'seller'> & {
  seller: Seller;
  condition: Condition | null;
  category: Category;
  brand: string | null;
  photos: Picture[];
  specs: { label: string; value: string }[];
  description: string;
  views: number | null;
  allowOffers: boolean;
};

/** Đúng bộ lọc mà `GET /listings` nhận — server chưa có sắp xếp hay lọc theo tình trạng. */
/** Khoảng số của một mục mẫu: một hay cả hai đầu. */
export type AttributeRange = { min?: number; max?: number };
/**
 * Bộ lọc theo mẫu thông tin của danh mục (TK 11): tên mục → các giá trị đã chọn (mục chọn một / chọn nhiều, tin
 * khớp khi có một trong số đó) hay khoảng số. Chỉ có nghĩa khi đã chọn danh mục; đổi danh mục thì bỏ.
 */
export type AttributeFilters = Record<string, string[] | AttributeRange>;

export type SearchFilters = {
  q: string;
  categoryId: string | null;
  provinceCode: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  attrs: AttributeFilters;
};

export const NO_FILTERS: SearchFilters = {
  q: '',
  categoryId: null,
  provinceCode: null,
  minPrice: null,
  maxPrice: null,
  attrs: {},
};

/**
 * Server không nhận một mục lọc — 400 `VALIDATION_ERROR` kèm `details.field`: mẫu của danh mục đổi giữa hai lượt
 * tìm, mục đã bị bỏ. Lỗi khác trả `null` để màn hiện như mọi lỗi tìm kiếm.
 */
export function staleFilterField(error: unknown): { field: string; message: string } | null {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return null;
  const details: unknown = error.details;
  const field =
    typeof details === 'object' && details !== null && 'field' in details ? details.field : null;
  return typeof field === 'string' ? { field, message: error.message } : null;
}

/** Trạng thái của server, trừ `removed` (tin đã gỡ không hiện ở "Tin của tôi"). */
export type MyListingState =
  'draft' | 'checking' | 'pending' | 'live' | 'rejected' | 'expired' | 'sold';

export type MyListing = ListingCard & {
  state: MyListingState;
  views: number | null;
  saves: number | null;
  /** null với nháp và tin chưa từng lên sàn. */
  expiresAt: string | null;
  /** Lời của máy duyệt / người duyệt gửi người đăng: vì sao còn chờ, vì sao bị từ chối. */
  note: string | null;
  /** Lỗi người đăng tự sửa được, mỗi lỗi một câu của server — vd "Ảnh 2 quá nhỏ. Thay bằng ảnh chụp rõ hơn." */
  fixes: string[];
  /** Mã tra cứu của lần máy giữ vì dấu hiệu gian lận — người đăng gửi cho hỗ trợ khi nghĩ là nhầm (spec explanations). */
  lookupCode: string | null;
  /** Gia hạn gửi kèm phiên bản như mọi lượt sửa: hai máy của một người không ghi đè nhau. */
  version: number;
  /** Server mở gia hạn trong 7 ngày cuối (`early`) hay sau khi hết hạn (`expired`); null = chưa gia hạn được. */
  renewal: 'early' | 'expired' | null;
  /** Hạn chuyển lên chợ chung — chỉ có với tin đã rời nhóm hẳn. */
  moveUntil: string | null;
};

export type MyListingAction = 'withdraw' | 'renew' | 'move' | 'delete';

/** Hành động server sẽ nhận cho tin này; xoá thì mọi trạng thái đều được. */
export function myListingActions(l: MyListing, now: number = Date.now()): MyListingAction[] {
  const actions: MyListingAction[] = [];
  if (l.state === 'pending') actions.push('withdraw');
  if (l.renewal !== null) actions.push('renew');
  if (l.moveUntil !== null && Date.parse(l.moveUntil) > now) actions.push('move');
  actions.push('delete');
  return actions;
}

/** Một ô của mẫu thông số danh mục (`/categories/{id}/template`) — danh mục chưa có mẫu thì không có ô nào. */
export type TemplateField = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'single_choice' | 'multi_choice';
  required: boolean;
  options: string[];
};

/** Giá trị người đăng điền cho một ô mẫu; ô chọn nhiều là mảng. */
export type AttributeValue = string | string[];

/** Nội dung một lượt lưu tin. Rỗng ở đây là "chưa điền" — `saveListing` gửi null chứ không gửi chuỗi rỗng. */
export type ListingContent = {
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  categoryId: string | null;
  attributes: Record<string, AttributeValue>;
  provinceCode: number | null;
  wardCode: number | null;
  imageIds: string[];
  placement: Placement;
  /** Chỉ có nghĩa khi đăng trong nhóm. */
  groupId: string | null;
  /** Dòng "Thành viên «nhóm»" — server chỉ cho gắn lên tin sàn chung. */
  badgeGroupId: string | null;
};

/** Bản tin đang mở trên server; `version` chống ghi đè khi hai máy cùng sửa một tin. */
export type DraftRef = { id: string; version: number };

/** Tin của chính mình dựng lại vào form: làm tiếp nháp, hay sửa tin đang hiển thị. */
export type EditableListing = DraftRef &
  Omit<ListingContent, 'imageIds'> & {
    state: MyListingState;
    photos: { imageId: string; uri: string }[];
  };

/** Ảnh vừa chọn từ máy — cỡ gốc để quyết định có thu nhỏ hay không. */
export type PickedPhoto = { uri: string; width: number; height: number };

/** Người đăng phải tự chọn — server không đoán thay (spec placement). */
export type Placement = 'marketplace' | 'group_public' | 'members_only';

/** "Riêng tư · mở cửa" không tồn tại (spec group-modes). */
export type GroupMode = 'public_open' | 'public_review' | 'private_code' | 'private_invite';
export type GroupRole = 'member' | 'moderator' | 'owner';
/** Loại chỉ để chọn sẵn cài đặt lúc lập; trường học và công ty mới có lớp / phòng ban (spec membership). */
export type GroupKind = 'school' | 'company' | 'community' | 'other';
/** `closed` không bao giờ tới app — server trả 404 cho nhóm đã đóng. */
export type GroupState =
  'pending_owner' | 'active' | 'going_private' | 'ownerless' | 'locked' | 'closed';

export const isPublicGroup = (mode: GroupMode): boolean =>
  mode === 'public_open' || mode === 'public_review';

/** Chữ của spec group-modes, dùng chung cho trang nhóm, cài đặt nhóm và bàn vận hành. */
export const GROUP_MODE_LABEL: Record<GroupMode, string> = {
  public_open: 'Công khai · mở cửa',
  public_review: 'Công khai · xét duyệt',
  private_code: 'Riêng tư · có mã',
  private_invite: 'Riêng tư · chỉ lời mời',
};

/** Thành viên thường không mang nhãn. */
export const GROUP_ROLE_TAG: Partial<Record<GroupRole, string>> = {
  owner: 'Chủ nhóm',
  moderator: 'Điều hành viên',
};

export type GroupSummary = {
  id: string;
  name: string;
  /** Server không có ảnh đại diện nhóm: ô chữ cái thay. */
  initials: string;
  kind: GroupKind;
  mode: GroupMode;
  state: GroupState;
  memberCount: number;
  description: string | null;
};

export type MyGroup = GroupSummary & {
  role: GroupRole;
  /** Gắn được dòng "Thành viên «nhóm»" lên tin sàn chung — vào bằng "bấm tham gia" thì không bao giờ có. */
  badgeEligible: boolean;
};

/** Đơn đang chờ của chính mình; `expiresAt` = lúc đơn tự huỷ nếu chưa ai xử. */
export type JoinRequest = { id: string; expiresAt: string };

/**
 * Người ngoài nhóm riêng tư chỉ thấy tên (`visible: false`) và không biết nhóm vào bằng mã hay chỉ bằng lời mời —
 * màn nhóm đưa cả hai đường.
 */
export type Group =
  | { visible: false; id: string; name: string; initials: string; joinRequest: JoinRequest | null }
  | (GroupSummary & {
      visible: true;
      boardStyle: 'list' | 'grid';
      /** Người ngoài đăng được tin "công khai trong nhóm". */
      allowOutsiders: boolean;
      /** Tin sàn của thành viên mang tên nhóm — chỉ bật được ở nhóm riêng tư. */
      showNameOnMarketplace: boolean;
      /** Chỉ chủ nhóm và điều hành viên được biết lý do khoá. */
      lockedReason: string | null;
      /** Mã vào nhóm — chỉ chủ nhóm và điều hành viên thấy; nhóm không dùng mã thì null. */
      code: string | null;
      units: GroupUnit[];
      /** null = chưa vào nhóm. */
      role: GroupRole | null;
      /** Điều hành viên phụ trách một lớp chỉ xử việc trong lớp đó; null = cả nhóm (hay không phải điều hành viên). */
      moderatorUnitId: string | null;
      badgeEligible: boolean;
      joinRequest: JoinRequest | null;
    });

/** Lớp / đơn vị con của nhóm (lớp 12A1, phòng ban). */
export type GroupUnit = { id: string; name: string };

export type GroupMember = {
  id: string;
  name: string;
  role: GroupRole;
  unitId: string | null;
  /** Điều hành viên phụ trách một lớp; null = cả nhóm (hay không phải điều hành viên). */
  moderatorUnitId: string | null;
  /** Đường vào được ghi lại lúc vào và không đổi (spec membership). */
  joinedVia: 'joined' | 'approved' | 'invited' | 'roster' | 'assigned';
  joinedAt: string;
};

export type GroupAnnouncement = { id: string; body: string; at: string };

export type GroupInvites = {
  invitations: {
    id: string;
    groupId: string;
    groupName: string;
    initials: string;
    expiresAt: string;
  }[];
  /** Có tên trong danh sách lớp: bấm vào nhóm là thành viên, không cần duyệt. */
  rosters: { groupId: string; groupName: string; initials: string }[];
};

/** `request` = thành đơn chờ duyệt (nhóm xét duyệt, nhóm có mã). */
export type JoinOutcome = 'member' | 'request';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'superseded';

export type Message =
  | { id: string; kind: 'text'; mine: boolean; text: string; at: string }
  | { id: string; kind: 'offer'; mine: boolean; amount: number; status: OfferStatus; at: string };

/**
 * `null` = server không cho biết: bên kia là đội, có chặn, đã rời Ghim, hay một trong hai bên tắt trạng thái hoạt
 * động (tắt là hai chiều). `lastActiveAt` đã làm tròn phút và chỉ có trong 7 ngày gần nhất.
 */
export type Activity = { online: boolean; lastActiveAt: string | null };

export type Peer = Person & { activity: Activity | null };

/** `support`, `group`: bên kia là cả đội — "Hỗ trợ Ghim", "Quản trị nhóm «tên»" — không gắn tin nào. */
export type ConversationKind = 'listing' | 'support' | 'group';

/** Giá `null` khi người đăng đã xoá tin. */
type ListingRef = Pick<ListingCard, 'id' | 'title' | 'cover'> & { price: number | null };

export type ConversationSummary = {
  id: string;
  kind: ConversationKind;
  peer: Peer;
  listing: ListingRef | null;
  lastMessage: string;
  at: string;
  unread: number;
};

export type Conversation = Pick<ConversationSummary, 'id' | 'kind' | 'peer' | 'listing'> & {
  messages: Message[];
  /** Người bán của hội thoại về tin: người duy nhất trả lời được đề nghị giá. */
  isSeller: boolean;
  canOffer: boolean;
  /** `null` = gửi được; còn lại là câu giải thích vì sao hội thoại chỉ còn để đọc. */
  readOnly: string | null;
};

export type ConversationTarget =
  { kind: 'listing'; id: string } | { kind: 'group'; id: string } | { kind: 'support' };

/** `deal` = chuyện mua bán (tin nhắn, tin của bạn, tin mới trong nhóm); `system` = tài khoản, nhóm, báo cáo, gậy, hỗ trợ. */
export type NoticeTab = 'deal' | 'system';

export type NoticeKind = 'message' | 'offer' | 'listing' | 'expiring' | 'group' | 'account';

export type NoticeTarget =
  | { screen: 'chat'; id: string }
  | { screen: 'listing'; id: string }
  | { screen: 'group'; id: string }
  | { screen: 'profile' }
  | { screen: 'warnings' };

export type Notice = {
  id: string;
  tab: NoticeTab;
  kind: NoticeKind;
  title: string;
  body: string;
  /**
   * Phần chỉ xem trong app — điều luật, ngày hết hạn, hạn khiếu nại, lý do từ chối: server cố ý để ngoài `body` vì
   * `body` lên cả màn hình khoá (ghim-server `docs/realtime.md`).
   */
  detail: string | null;
  /** Dòng gộp nổi lên theo lần cập nhật cuối, không theo lúc tạo. */
  at: string;
  read: boolean;
  /** `null` = không có màn nào để mở (báo cáo, hỗ trợ không gắn hội thoại) — bấm chỉ đánh dấu đã đọc. */
  target: NoticeTarget | null;
};

export type Me = Person & {
  email: string;
  idVerified: boolean;
  memberSince: number;
  /** Khu vực mặc định khi đăng tin và khi tìm kiếm — server chưa lưu, nên null với tài khoản thật. */
  place: Place | null;
  rating: number | null;
  /** Hiện trạng thái hoạt động trong chat — tắt là hai chiều: mình cũng không thấy của ai. */
  showActivity: boolean;
  avatarUrl: string | null;
  /** Chưa xác nhận thì đăng nhập được nhưng đăng tin, tải ảnh, nhắn tin, vào nhóm đều bị server chặn. */
  emailVerified: boolean;
  isMaster: boolean;
  /** Có lối vào bàn vận hành: master, hoặc staff có quyền đang hiệu lực — quyền đang treo thì bàn không làm được gì. */
  opsAccess: boolean;
};

/** Một thiết bị đang đăng nhập. `current` = chính máy này — đăng xuất máy này là việc của nút Đăng xuất. */
export type DeviceSession = {
  id: string;
  deviceName: string;
  lastActiveAt: string;
  current: boolean;
};

/** `name` null khi tài khoản kia đã xoá — vẫn gỡ chặn được. */
export type BlockedPerson = { id: string; name: string | null; blockedAt: string };

export type HelpTopic = { id: string; label: string; faqs: { q: string; a: string }[] };

/**
 * Một cảnh cáo của chính mình. API gọi là "gậy" (`strike`); mọi chữ người dùng đọc gọi là cảnh cáo
 * (ghim-server rename-strike-to-warning).
 */
export type MyStrike = {
  id: string;
  kind: WireStrike['kind'];
  status: WireStrike['status'];
  points: number;
  /** Đang tính vào điểm vi phạm lúc đọc. */
  inForce: boolean;
  rule: string;
  issuedAt: string;
  expiresAt: string | null;
  /** Server trả `null` khi chưa huỷ — SDK sinh từ enum nullable làm mất `| null`. */
  cancelCause: WireStrike['cancelCause'] | null;
  /** Server đã xét: cảnh cáo thường / nặng, còn trong hạn, chưa khiếu nại lần nào. */
  appealable: boolean;
  appealUntil: string | null;
  appeal: NonNullable<WireStrike['appeal']>['status'] | null;
};

/** Phần cảnh cáo của bảng uy tín (`GET /me/trust`). */
export type MyStanding = {
  points: number;
  /** Đang tạm dừng đăng tin mới: ngày điểm vi phạm về dưới ngưỡng. */
  postingLockedUntil: string | null;
  strikes: MyStrike[];
};

export type Session = { accessToken: string; refreshToken: string };

export type Registration = { email: string; password: string; displayName: string };

/** Refresh token null chỉ xảy ra với `client: 'web'` (server cất vào cookie); app luôn xin `'app'`. */
function toSession(d: { accessToken: string; refreshToken: string | null }): Session {
  if (!d.refreshToken) {
    throw new ApiError('NO_REFRESH_TOKEN', 'Máy chủ không trả mã giữ phiên, hãy đăng nhập lại', 0);
  }
  return { accessToken: d.accessToken, refreshToken: d.refreshToken };
}

/* ------------------------------ wire → domain ------------------------------ */

/**
 * Tên cho những mã mà tin đăng chỉ mang id (danh mục, tỉnh, phường). `queries/` dựng từ cache dữ liệu tham
 * chiếu, nên một trang 30 tin không kéo theo 30 lượt hỏi tên tỉnh.
 */
export type Lookups = {
  category: (id: string) => Category | null;
  place: (provinceCode: number | null, wardCode: number | null) => Place;
};

/** Nhận các mã tỉnh có trên trang (danh sách phường tải theo tỉnh) và trả bộ tra tên đã sẵn sàng. */
export type LoadLookups = (provinceCodes: number[]) => Promise<Lookups>;

type WireListing = GetApiV1ListingsResponses[200]['data']['items'][number];
type WireUser = GetApiV1UsersByIdResponses[200]['data'];
type WireMe = GetApiV1MeResponses[200]['data'];
type WireConversation = GetApiV1MeConversationsByConversationIdResponses[200]['data'];
type WireMessage =
  GetApiV1MeConversationsByConversationIdMessagesResponses[200]['data']['items'][number];
type WireNotice = GetApiV1MeNotificationsResponses[200]['data']['items'][number];
type WireGroupSummary = GetApiV1GroupsResponses[200]['data']['items'][number];
type WireMyGroup = GetApiV1MeGroupsResponses[200]['data'][number];
type WireGroupView = GetApiV1GroupsByGroupIdResponses[200]['data'];
type WireTrust = GetApiV1MeTrustResponses[200]['data'];
type WireStrike = WireTrust['strikes'][number];

/** Trang đầu đủ cho trang chủ và một màn kết quả; cuộn tải thêm (`nextCursor`) chưa làm. */
const PAGE_SIZE = 30;

/**
 * Trần một trang của server (`MAX_LIMIT`). "Tin của tôi" đếm số tin từ chính trang này vì server không trả
 * tổng — người bán có hơn 100 tin còn sống thì con số sẽ thiếu tới khi có tải thêm.
 */
const MY_PAGE_SIZE = 100;

const toPicture = (img: { url: string }): Picture => ({ uri: img.url });

/**
 * Tiêu đề, giá và ảnh là bắt buộc khi gửi duyệt (server `MISSING_LABELS`), nên tin công khai luôn có đủ —
 * null chỉ có ở nháp. Phần dự phòng dưới đây chỉ để type đủ, không phải một trạng thái màn hình phải vẽ.
 */
function toCard(w: WireListing, lookups: Lookups): ListingCard {
  return {
    id: w.id,
    title: w.title ?? '',
    price: w.price ?? 0,
    cover: w.images[0] ? toPicture(w.images[0]) : { uri: '' },
    place: lookups.place(w.provinceCode, w.wardCode),
    postedAt: w.firstLiveAt ?? w.createdAt,
    boosted: w.featuredUntil !== null && Date.parse(w.featuredUntil) > Date.now(),
    seller: null,
    groupName: w.badge?.name ?? null,
    ended: w.state === 'sold' || w.state === 'expired' ? w.state : null,
  };
}

const provincesOf = (items: WireListing[]) => [
  ...new Set(items.flatMap((w) => (w.provinceCode === null ? [] : [w.provinceCode]))),
];

async function toCards(items: WireListing[], load: LoadLookups): Promise<ListingCard[]> {
  const lookups = await load(provincesOf(items));
  return items.map((w) => toCard(w, lookups));
}

/** Thông số = các ô của đúng phiên bản mẫu mà tin đã dùng, theo thứ tự của mẫu; ô bỏ trống thì không hiện. */
function toSpecs(fields: { name: string; label: string }[], attributes: Record<string, unknown>) {
  return fields.flatMap((f) => {
    const raw = attributes[f.name];
    const value = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string' || typeof raw === 'number'
        ? String(raw)
        : '';
    return value.trim() === '' ? [] : [{ label: f.label, value }];
  });
}

/** Server chưa lưu xác minh giấy tờ, đánh giá hay khu vực mặc định của tài khoản. */
function toMe(u: WireMe): Me {
  return {
    id: u.id,
    name: u.displayName,
    verified: false,
    email: u.email,
    idVerified: false,
    memberSince: new Date(u.joinedAt).getFullYear(),
    place: null,
    rating: null,
    showActivity: u.showActivity,
    avatarUrl: u.avatarUrl,
    emailVerified: u.emailVerified,
    isMaster: u.role === 'master',
    opsAccess: u.role === 'master' || u.staff,
  };
}

/** Hồ sơ công khai mới có tên, ảnh, ngày tham gia — chưa có xác minh, đánh giá hay số giao dịch. */
function toSeller(u: WireUser, showPhone: boolean): Seller {
  return {
    id: u.id,
    name: u.displayName,
    verified: false,
    rating: null,
    deals: null,
    replyMinutes: null,
    phone: showPhone ? (u.phone?.number ?? null) : null,
    joinedAt: u.joinedAt,
  };
}

/* -------------------------------- đăng tin -------------------------------- */

type WireDetail = GetApiV1ListingsByIdResponses[200]['data'];

const toRef = (w: { id: string; version: number }): DraftRef => ({ id: w.id, version: w.version });

/**
 * Chuỗi rỗng → null: server lưu nguyên những gì nhận, và "" ở tiêu đề là một tiêu đề rỗng chứ không phải
 * "chưa điền" — lượt gửi duyệt sẽ không báo thiếu tiêu đề. Nhóm và huy hiệu đi theo nơi đăng: server từ chối
 * huy hiệu trên tin trong nhóm, còn `null` ở huy hiệu là gỡ — không bao giờ để sót lại từ lần chọn trước.
 */
function toContentBody(c: ListingContent) {
  const attributes = Object.fromEntries(
    Object.entries(c.attributes).filter(([, v]) =>
      Array.isArray(v) ? v.length > 0 : v.trim() !== '',
    ),
  );
  return {
    title: c.title.trim() || null,
    description: c.description.trim() || null,
    price: c.price > 0 ? c.price : null,
    negotiable: c.negotiable,
    categoryId: c.categoryId,
    attributes,
    provinceCode: c.provinceCode,
    wardCode: c.wardCode,
    imageIds: c.imageIds,
    placement: c.placement,
    groupId: c.placement === 'marketplace' ? null : c.groupId,
    badgeGroupId: c.placement === 'marketplace' ? c.badgeGroupId : null,
  };
}

const toAttribute = (v: unknown): AttributeValue | null =>
  Array.isArray(v)
    ? v.map(String)
    : typeof v === 'string' || typeof v === 'number'
      ? String(v)
      : null;

/** Bản của chủ tin mới có `version`; người khác mở link chỉ nhận bản công khai, không sửa được. */
function toEditable(w: WireDetail): EditableListing {
  if (!('version' in w))
    throw new ApiError('NOT_OWNER', 'Chỉ người đăng mới sửa được tin này', 403);
  if (w.state === 'removed') throw new ApiError('NOT_EDITABLE', 'Tin đã gỡ, không sửa được', 409);
  return {
    id: w.id,
    version: w.version,
    state: w.state,
    title: w.title ?? '',
    description: w.description ?? '',
    price: w.price ?? 0,
    negotiable: w.negotiable,
    categoryId: w.categoryId,
    attributes: Object.fromEntries(
      Object.entries(w.attributes).flatMap(([k, v]) => {
        const a = toAttribute(v);
        return a === null ? [] : [[k, a]];
      }),
    ),
    provinceCode: w.provinceCode,
    wardCode: w.wardCode,
    placement: w.placement,
    groupId: w.groupId,
    badgeGroupId: w.badgeGroupId,
    photos: w.images.map((img) => ({ imageId: img.id, uri: img.url })),
  };
}

/** Mã lỗi của app khi ảnh nén xong vẫn nhỏ hơn cạnh ngắn tối thiểu server trả trong phiếu tải ảnh. */
export const IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL';

/** Màn rộng nhất ~430pt × 3 = 1290px; 1600 đủ cho màn chi tiết và phóng nhẹ. */
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.75;

/**
 * Luôn vẽ lại thành JPEG, kể cả ảnh đã nhỏ: iPhone trả HEIC nguyên bản mà server từ chối, và lượt vẽ lại là
 * thứ gỡ EXIF — trong đó có toạ độ GPS chỗ chụp, thường là nhà người bán; ảnh đi thẳng vào kho nên server
 * không gỡ hộ được. Nén hỏng thì để lỗi nổi lên, không tải ảnh gốc (`docs/media.md` bước 1).
 */
async function preparePhoto(p: PickedPhoto): Promise<{ uri: string; shortSide: number }> {
  const context = ImageManipulator.manipulate(p.uri);
  if (Math.max(p.width, p.height) > PHOTO_MAX_EDGE) {
    context.resize(p.width >= p.height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, shortSide: Math.min(saved.width, saved.height) };
}

/**
 * Web nhận URL blob/data nên đọc bằng `fetch`. Máy thật dùng `File` của expo-file-system: `fetch` của SDK 57
 * (chuẩn WinterCG) không nhận part `{ uri, name, type }` kiểu React Native cũ; `File` tương thích Blob nhưng
 * lib DOM của TS không biết nó, nên phải ép kiểu. Cỡ phải đúng từng byte với `byteSize` đã khai.
 */
async function fileOf(uri: string): Promise<{ body: Blob; size: number }> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return { body: blob, size: blob.size };
  }
  const file = new File(uri);
  return { body: file as unknown as Blob, size: file.size ?? 0 };
}

/**
 * Nén → xin quyền tải cho đúng một ảnh → tải thẳng lên kho (`ghim-server/docs/media.md`). Ảnh chỉ thuộc về chủ của
 * nó (tin, hồ sơ) khi được gắn bằng `imageId`; không gắn trong 48 giờ thì server dọn.
 */
async function uploadImage(
  owner: { kind: 'listing' | 'profile'; id: string },
  photo: PickedPhoto,
): Promise<string> {
  const prepared = await preparePhoto(photo);
  const { body, size } = await fileOf(prepared.uri);
  const grant = await unwrap(
    postApiV1MediaUploads({
      body: { ownerKind: owner.kind, ownerId: owner.id, contentType: 'image/jpeg', byteSize: size },
    }),
  );
  // Máy duyệt giữ tin có ảnh quá nhỏ (add-image-quality-checks): chặn ngay ở ô ảnh thay vì để tin chờ duyệt.
  // Ảnh đại diện không bị kiểm. Phiếu chưa dùng thì server tự dọn sau 48 giờ.
  if (owner.kind === 'listing' && prepared.shortSide < grant.minShortSide) {
    throw new ApiError(
      IMAGE_TOO_SMALL,
      `Ảnh quá nhỏ, cần cạnh ngắn từ ${grant.minShortSide}px`,
      400,
    );
  }
  const { method, url, headers, fields } = grant.upload;
  let res: Response;
  if (method === 'POST') {
    // Đúng nguyên văn các trường đã ký, tệp đứng cuối — thừa, thiếu hay đổi thứ tự là chữ ký sai.
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    form.append('file', body, 'photo.jpg');
    res = await fetch(url, { method, body: form, headers });
  } else {
    res = await fetch(url, { method, body, headers });
  }
  if (!res.ok) throw new ApiError('UPLOAD_FAILED', 'Không tải được ảnh lên, thử lại', res.status);
  return grant.imageId;
}

/* --------------------------------- tin nhắn -------------------------------- */

/** Đủ cho một hội thoại đang mở; cũ hơn nữa thì chưa có nút tải thêm (server phân trang bằng con trỏ). */
const MESSAGE_PAGE = 100;
/** Trần một trang của server (`MAX_LIMIT`). */
const CONVERSATION_PAGE = 100;
/** Trần một trang của server (`MAX_LIMIT`): danh sách chặn chưa có nút tải thêm. */
const BLOCK_PAGE = 100;
/** Báo cáo mình gửi trong một trang — người dùng hiếm khi báo quá con số này. */
const MY_REPORT_PAGE = 50;

const toMessage = (w: WireMessage): Message =>
  w.kind === 'offer' && w.offer
    ? {
        id: w.id,
        kind: 'offer',
        mine: w.fromMe,
        amount: w.offer.amount,
        status: w.offer.status,
        at: w.createdAt,
      }
    : { id: w.id, kind: 'text', mine: w.fromMe, text: w.body, at: w.createdAt };

function toPeer({ counterpart }: WireConversation): Peer {
  const fallback = counterpart.gone ? 'Tài khoản đã xoá' : 'Người dùng Ghim';
  return {
    // Bên kia là đội thì không có tài khoản nào — mã của đội đủ để Avatar và danh sách phân biệt.
    id: counterpart.accountId ?? counterpart.kind,
    name: counterpart.displayName ?? fallback,
    verified: false,
    activity: counterpart.activity,
  };
}

const toListingRef = (listing: WireConversation['listing']): ListingRef | null =>
  listing && {
    id: listing.id,
    title: listing.title ?? 'Tin đã bị xoá',
    price: listing.price,
    cover: listing.cover ? toPicture(listing.cover) : { uri: '' },
  };

const previewOf = (last: WireMessage | null): string => {
  if (!last) return 'Chưa có tin nhắn';
  const text =
    last.kind === 'offer' && last.offer ? `Trả giá ${formatVnd(last.offer.amount)}` : last.body;
  return last.fromMe ? `Bạn: ${text}` : text;
};

function toSummary(w: WireConversation): ConversationSummary {
  return {
    id: w.id,
    kind: w.kind,
    peer: toPeer(w),
    listing: toListingRef(w.listing),
    lastMessage: previewOf(w.lastMessage),
    at: w.lastMessage?.createdAt ?? w.lastActivityAt,
    unread: w.unreadCount,
  };
}

/** Câu cho ô soạn khi server không cho gửi — đúng lý do mà không lộ ai chặn ai (spec messaging/blocking). */
const readOnlyOf = (w: WireConversation): string | null => {
  if (w.canSend) return null;
  if (w.locked) return 'Hội thoại này không nhận tin nhắn';
  if (w.counterpart.gone) return 'Người kia đã rời Ghim — hội thoại chỉ còn để đọc';
  return 'Hội thoại này chỉ còn để đọc';
};

/* -------------------------------- thông báo -------------------------------- */

/** Một trang đủ cho hộp thư trên điện thoại; dòng gộp giữ số dòng nhỏ. Chưa có nút tải thêm. */
const NOTICE_PAGE = 100;

const DEAL_CATEGORIES: ReadonlySet<WireNotice['category']> = new Set([
  'messages',
  'your_listings',
  'group_new_listings',
]);

const EXPIRING_TYPES: ReadonlySet<string> = new Set([
  'listing.expiry.reminder',
  'listing.purge.reminder',
]);

/** `trust.strike.*`, `trust.appeal.*` (N49–N55); mức tin cậy và thời gian chờ vẫn mở trang Cá nhân. */
const WARNING_TYPES = /^trust\.(strike|appeal)\./;

/**
 * Lời trả giá tới dưới `messaging.message.received` như mọi tin, thân "Trả giá …" đã tự nói — không đoán theo câu chữ
 * của server; chỉ kết quả trả giá có loại riêng.
 */
function kindOf(w: WireNotice): NoticeKind {
  if (w.type === 'messaging.offer.answered') return 'offer';
  if (w.category === 'messages' || w.category === 'support') return 'message';
  if (EXPIRING_TYPES.has(w.type)) return 'expiring';
  if (w.category === 'your_listings' || w.category === 'group_new_listings') return 'listing';
  if (w.category === 'your_groups' || w.category === 'group_announcements') return 'group';
  return 'account';
}

/**
 * Màn mở theo mã trong `data` (`ghim-server/docs/realtime.md`): hội thoại trước, rồi tin. Tin của chính mình (duyệt,
 * hết hạn) mở "Tin của tôi" — ở đó có trạng thái và lời giải thích. Mọi chuyện còn lại của nhóm mở trang nhóm, kể cả
 * lời mời và danh sách lớp: trang nhóm tự đưa nút "Nhận lời mời" / "Vào nhóm". Cảnh cáo và kết quả khiếu nại mở
 * "Cảnh cáo của tôi" — nơi duy nhất có nút khiếu nại mà câu nhắc hứa hẹn.
 */
function targetOf(w: WireNotice): NoticeTarget | null {
  const { conversationId, listingId } = w.data;
  if (conversationId) return { screen: 'chat', id: conversationId };
  if (w.category === 'group_new_listings' && listingId) return { screen: 'listing', id: listingId };
  if (WARNING_TYPES.test(w.type)) return { screen: 'warnings' };
  if (
    w.category === 'your_listings' ||
    w.category === 'account' ||
    w.category === 'trust_strikes'
  ) {
    return { screen: 'profile' };
  }
  return w.groupId ? { screen: 'group', id: w.groupId } : null;
}

const toStrike = (s: WireStrike): MyStrike => ({
  id: s.id,
  kind: s.kind,
  status: s.status,
  points: s.points,
  inForce: s.inForce,
  rule: `Điều ${s.ruleCode}: ${s.ruleText}`,
  issuedAt: s.issuedAt,
  expiresAt: s.expiresAt,
  cancelCause: s.cancelCause,
  appealable: s.appealable,
  appealUntil: s.appealUntil,
  appeal: s.appeal?.status ?? null,
});

/** Cảnh cáo còn tính điểm lên đầu, rồi mới nhất trước — server trả theo thứ tự ra cảnh cáo. */
const toStanding = (w: WireTrust): MyStanding => ({
  points: w.strikePoints,
  postingLockedUntil: w.postingLockedUntil,
  strikes: w.strikes
    .map(toStrike)
    .sort((a, b) => Number(b.inForce) - Number(a.inForce) || b.issuedAt.localeCompare(a.issuedAt)),
});

const toNotice = (w: WireNotice): Notice => ({
  id: w.id,
  tab: DEAL_CATEGORIES.has(w.category) ? 'deal' : 'system',
  kind: kindOf(w),
  title: w.title,
  body: w.body,
  detail: w.detail,
  at: w.updatedAt,
  read: w.readAt !== null,
  target: targetOf(w),
});

/* ---------------------------------- nhóm ---------------------------------- */

/** Trần một trang của server (`MAX_LIMIT`): danh sách nhóm và thành viên chưa có nút tải thêm. */
const GROUP_PAGE = 100;
/** Khung trên đầu trang nhóm chỉ hiện thông báo mới nhất; phần còn lại xem ở tab Giới thiệu. */
const ANNOUNCEMENT_PAGE = 20;

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();

const toGroupSummary = (w: WireGroupSummary): GroupSummary => ({
  id: w.id,
  name: w.name,
  initials: initialsOf(w.name),
  kind: w.kind,
  mode: w.mode,
  state: w.state,
  memberCount: w.memberCount,
  description: w.description,
});

const toMyGroup = (w: WireMyGroup): MyGroup => ({
  ...toGroupSummary(w),
  role: w.membership.role,
  badgeEligible: w.membership.badgeEligible,
});

const toJoinRequest = (w: { id: string; expiresAt: string } | null): JoinRequest | null =>
  w && { id: w.id, expiresAt: w.expiresAt };

function toGroup(w: WireGroupView): Group {
  if (w.visibility === 'name_only') {
    return {
      visible: false,
      id: w.id,
      name: w.name,
      initials: initialsOf(w.name),
      joinRequest: toJoinRequest(w.joinRequest),
    };
  }
  return {
    ...toGroupSummary(w),
    visible: true,
    boardStyle: w.boardStyle,
    allowOutsiders: w.allowOutsiders,
    showNameOnMarketplace: w.showNameOnMarketplace,
    lockedReason: w.lockedReason,
    code: w.code,
    units: w.units.map(({ id, name }) => ({ id, name })),
    role: w.membership?.role ?? null,
    moderatorUnitId: w.membership?.moderatorUnitId ?? null,
    badgeEligible: w.membership?.badgeEligible ?? false,
    joinRequest: toJoinRequest(w.joinRequest),
  };
}

/* ---------------------------------- api ----------------------------------- */

export const api = {
  getReadiness: (): Promise<Readiness> => unwrap(getHealthReady()),

  getCategories: async (): Promise<Category[]> =>
    (await unwrap(getApiV1Categories())).map(({ id, name }) => ({ id, name })),

  getProvinces: async (): Promise<Province[]> =>
    (await unwrap(getApiV1RegionsProvinces())).map(({ code, name }) => ({ code, name })),

  getWards: async (provinceCode: number): Promise<Ward[]> =>
    (await unwrap(getApiV1RegionsProvincesByCodeWards({ path: { code: provinceCode } }))).map(
      ({ code, name }) => ({ code, name }),
    ),

  searchListings: async (f: SearchFilters, load: LoadLookups): Promise<ListingCard[]> => {
    const page = await unwrap(
      getApiV1Listings({
        query: {
          q: f.q.trim() || undefined,
          categoryId: f.categoryId ?? undefined,
          provinceCode: f.provinceCode ?? undefined,
          priceMin: f.minPrice ?? undefined,
          priceMax: f.maxPrice ?? undefined,
          attrs: Object.keys(f.attrs).length > 0 ? JSON.stringify(f.attrs) : undefined,
          limit: PAGE_SIZE,
        },
      }),
    );
    return toCards(page.items, load);
  },

  getListing: async (id: string, load: LoadLookups): Promise<ListingDetail> => {
    const w = await unwrap(getApiV1ListingsById({ path: { id } }));
    const [lookups, owner, template] = await Promise.all([
      load(w.provinceCode === null ? [] : [w.provinceCode]),
      unwrap(getApiV1UsersById({ path: { id: w.ownerId } })),
      w.categoryId !== null && w.templateVersion !== null
        ? unwrap(
            getApiV1CategoriesByIdTemplateVersionsByVersion({
              path: { id: w.categoryId, version: w.templateVersion },
            }),
          )
        : null,
    ]);
    return {
      ...toCard(w, lookups),
      seller: toSeller(owner, w.showPhone),
      condition: null,
      category: (w.categoryId ? lookups.category(w.categoryId) : null) ?? {
        id: w.categoryId ?? '',
        name: '',
      },
      brand: null,
      photos: w.images.map(toPicture),
      specs: template ? toSpecs(template.fields, w.attributes) : [],
      description: w.description ?? '',
      views: null,
      allowOffers: w.negotiable,
    };
  },

  getSimilar: async (id: string, load: LoadLookups): Promise<ListingCard[]> =>
    toCards(await unwrap(getApiV1ListingsByIdSuggestions({ path: { id } })), load),

  /** Trang người bán không có tin cụ thể nào để cho phép hiện số điện thoại, nên số luôn ẩn. */
  getSeller: async (id: string): Promise<Seller> =>
    toSeller(await unwrap(getApiV1UsersById({ path: { id } })), false),

  /** Chỉ tin đang hiển thị mà người xem được phép thấy: server lọc theo phiên, khách thấy ít hơn thành viên nhóm. */
  getSellerListings: async (id: string, load: LoadLookups): Promise<ListingCard[]> =>
    toCards(
      (await unwrap(getApiV1UsersByIdListings({ path: { id }, query: { limit: PAGE_SIZE } })))
        .items,
      load,
    ),

  /** Mọi mã đã lưu, kể cả tin đang không hiện: mở tin đó bằng đường link vẫn thấy trái tim đã tô. */
  getSavedIds: (): Promise<string[]> => unwrap(getApiV1MeSavedListingsIds()),

  /** Lưu tin đã lưu hay bỏ lưu tin chưa lưu đều 204 — chạm hai lần liền không thành lỗi. */
  setSaved: (listingId: string, saved: boolean): Promise<void> =>
    unwrapEmpty(
      saved
        ? putApiV1MeSavedListingsByListingId({ path: { listingId } })
        : deleteApiV1MeSavedListingsByListingId({ path: { listingId } }),
    ),

  /** Lưu gần nhất trước. Tin thôi hiện (đã bán, hết hạn…) server bỏ khỏi trang nhưng giữ lần lưu: hiện lại thì có lại. */
  getSavedListings: async (load: LoadLookups): Promise<ListingCard[]> =>
    toCards((await unwrap(getApiV1MeSavedListings({ query: { limit: PAGE_SIZE } }))).items, load),

  /**
   * Báo lại đúng tin mình đã báo khi báo cáo cũ còn mở thì server trả 200 thay vì 201 — với người báo hai trường hợp
   * như nhau. Mã máy tuỳ chọn, nhưng thiếu thì lượt báo không được tính vào ngưỡng tạm ẩn tin.
   */
  reportListing: async (listingId: string, category: ReportCategory): Promise<void> => {
    await unwrap(
      postApiV1Reports({
        headers: deviceHeaders(),
        body: { subject: { kind: 'listing', listingId }, category },
      }),
    );
  },

  getMe: async (): Promise<Me> => toMe(await unwrap(getApiV1Me())),

  setShowActivity: async (showActivity: boolean): Promise<Me> =>
    toMe(await unwrap(patchApiV1Me({ body: { showActivity } }))),

  /** Ảnh hồ sơ tải lên cho chính hồ sơ của mình (`profile`), rồi gắn bằng `imageId`. */
  setAvatar: async (accountId: string, photo: PickedPhoto): Promise<Me> => {
    const imageId = await uploadImage({ kind: 'profile', id: accountId }, photo);
    return toMe(await unwrap(putApiV1MeAvatar({ body: { imageId } })));
  },

  clearAvatar: async (): Promise<Me> => toMe(await unwrap(deleteApiV1MeAvatar())),

  /** Server thu hồi mọi phiên khác — máy này vẫn đăng nhập. */
  changePassword: (currentPassword: string, newPassword: string): Promise<void> =>
    unwrapEmpty(putApiV1MePassword({ body: { currentPassword, newPassword } })),

  getMyStanding: async (): Promise<MyStanding> => toStanding(await unwrap(getApiV1MeTrust())),

  /** 409 khi hết hạn, đã khiếu nại, hay là vi phạm nghiêm trọng (đi qua Hỗ trợ) — toast nói lý do của server. */
  appealStrike: async (strikeId: string, statement: string): Promise<void> => {
    await unwrap(
      postApiV1MeStrikesByStrikeIdAppeal({
        path: { strikeId },
        body: { statement: statement.trim() },
      }),
    );
  },

  getSessions: async (): Promise<DeviceSession[]> =>
    (await unwrap(getApiV1MeSessions())).map(({ id, deviceName, lastActiveAt, current }) => ({
      id,
      deviceName,
      lastActiveAt,
      current,
    })),

  /** `'others'` = mọi thiết bị khác, giữ máy này. */
  revokeSession: (id: string | 'others'): Promise<void> =>
    unwrapEmpty(
      id === 'others' ? deleteApiV1MeSessions() : deleteApiV1MeSessionsById({ path: { id } }),
    ),

  getBlocks: async (): Promise<BlockedPerson[]> =>
    (await unwrap(getApiV1MeBlocks({ query: { limit: BLOCK_PAGE } }))).items.map(
      ({ accountId, displayName, blockedAt }) => ({ id: accountId, name: displayName, blockedAt }),
    ),

  unblock: (accountId: string): Promise<void> =>
    unwrapEmpty(deleteApiV1MeBlocksByAccountId({ path: { accountId } })),

  /** Chặn hai chiều, mọi hội thoại về tin giữa hai người ngừng nhận tin; bên kia không được báo (spec blocking). */
  block: (accountId: string): Promise<void> =>
    unwrapEmpty(postApiV1MeBlocks({ body: { accountId } })),

  getNotificationPrefs: async (): Promise<NotificationPref[]> =>
    (await unwrap(getApiV1MeNotificationPreferences())).categories.map(({ category, enabled }) => ({
      category,
      enabled,
    })),

  /** Tắt thì thông báo vẫn vào mục Thông báo, chỉ không nhắc; "tài khoản" server trả 400 nếu tắt. */
  setNotificationPref: (category: NotificationCategory, enabled: boolean): Promise<void> =>
    unwrapEmpty(
      putApiV1MeNotificationPreferencesByCategory({ path: { category }, body: { enabled } }),
    ),

  getMyReports: async (): Promise<MyReport[]> =>
    (await unwrap(getApiV1MeReports({ query: { limit: MY_REPORT_PAGE } }))).items.map((w) => ({
      id: w.reportId,
      subject:
        w.subjectKind === 'listing' && w.listingId
          ? { kind: 'listing', id: w.listingId }
          : w.accountId
            ? { kind: 'account', id: w.accountId }
            : null,
      category: w.category,
      status: w.status,
      reportedAt: w.reportedAt,
      decidedAt: w.decidedAt,
    })),

  /** Tự nguyện, không ảnh hưởng gì (spec id-verification); đang có hồ sơ chờ thì server trả 409 kèm câu báo. */
  submitIdVerification: async (input: {
    documentType: IdDocumentType;
    documentNumber: string;
    fullName: string;
  }): Promise<IdSubmission> => {
    const w = await unwrap(
      postApiV1MeIdVerification({
        body: {
          documentType: input.documentType,
          documentNumber: input.documentNumber.trim(),
          fullName: input.fullName.trim(),
        },
      }),
    );
    return toIdSubmission(w);
  },

  /** Chưa nộp lần nào → `null`. Bị từ chối thì có lý do; nộp lại được ngay. */
  getMyIdVerification: async (): Promise<IdSubmission | null> => {
    const w = await unwrap(getApiV1MeIdVerification());
    return w ? toIdSubmission(w) : null;
  },

  /** Mã gửi tới email MỚI; email cũ vẫn là email đăng nhập tới khi xác nhận (spec email-change). */
  requestEmailChange: async (email: string, currentPassword: string): Promise<void> => {
    await unwrap(postApiV1MeEmailChange({ body: { email, currentPassword } }));
  },

  /** Xác nhận xong server thu hồi mọi phiên khác; phiên này vẫn dùng được. */
  confirmEmailChange: async (code: string): Promise<void> => {
    await unwrap(postApiV1MeEmailChangeConfirm({ body: { code } }));
  },

  /** Server thu hồi mọi phiên, kể cả máy này: app chỉ còn việc dọn phiên ở máy. */
  deleteAccount: (): Promise<void> => unwrapEmpty(deleteApiV1Me()),

  getNotices: async (): Promise<Notice[]> =>
    (await unwrap(getApiV1MeNotifications({ query: { limit: NOTICE_PAGE } }))).items.map(toNotice),

  unreadNoticeCount: async (): Promise<number> =>
    (await unwrap(getApiV1MeNotificationsUnreadCount())).count,

  /** `'all'` = mọi dòng của tôi; mã của người khác server trả 404. */
  markNoticesRead: async (ids: string[] | 'all'): Promise<void> => {
    await unwrap(postApiV1MeNotificationsRead({ body: ids === 'all' ? { all: true } : { ids } }));
  },

  /** Chỉ nhóm công khai — nhóm riêng tư không bao giờ có trong kết quả tìm (spec group-modes). */
  searchGroups: async (q: string): Promise<GroupSummary[]> =>
    (await unwrap(getApiV1Groups({ query: { q, limit: GROUP_PAGE } }))).items.map(toGroupSummary),

  getMyGroups: async (): Promise<MyGroup[]> => (await unwrap(getApiV1MeGroups())).map(toMyGroup),

  getGroup: async (id: string): Promise<Group> =>
    toGroup(await unwrap(getApiV1GroupsByGroupId({ path: { groupId: id } }))),

  /** Server tự lọc theo người xem: tin "chỉ thành viên" chỉ thành viên thấy. */
  getGroupListings: async (id: string, load: LoadLookups): Promise<ListingCard[]> => {
    const { items } = await unwrap(
      getApiV1GroupsByGroupIdListings({ path: { groupId: id }, query: { limit: PAGE_SIZE } }),
    );
    return toCards(items, load);
  },

  /** Chỉ chủ nhóm và điều hành viên đọc được — thành viên thường nhận 403 (spec membership). */
  getGroupMembers: async (id: string): Promise<GroupMember[]> => {
    const { items } = await unwrap(
      getApiV1GroupsByGroupIdMembers({ path: { groupId: id }, query: { limit: GROUP_PAGE } }),
    );
    return items.map((m) => ({
      id: m.accountId,
      name: m.displayName,
      role: m.role,
      unitId: m.unitId,
      moderatorUnitId: m.moderatorUnitId,
      joinedVia: m.joinedVia,
      joinedAt: m.joinedAt,
    }));
  },

  /** Chỉ thành viên; server đã lọc theo đơn vị của người xem, mới nhất trước. */
  getGroupAnnouncements: async (id: string): Promise<GroupAnnouncement[]> => {
    const { items } = await unwrap(
      getApiV1GroupsByGroupIdAnnouncements({
        path: { groupId: id },
        query: { limit: ANNOUNCEMENT_PAGE },
      }),
    );
    return items.map((a) => ({ id: a.id, body: a.body, at: a.createdAt }));
  },

  /** Mở cửa, lời mời, danh sách lớp → vào ngay; xét duyệt và có mã → đơn chờ duyệt. */
  joinGroup: async (id: string, code?: string): Promise<JoinOutcome> =>
    (
      await unwrap(
        postApiV1GroupsByGroupIdJoin({ path: { groupId: id }, body: code ? { code } : {} }),
      )
    ).result,

  withdrawJoinRequest: (id: string): Promise<void> =>
    unwrapEmpty(deleteApiV1GroupsByGroupIdJoinRequest({ path: { groupId: id } })),

  /** Chủ nhóm phải chuyển chủ trước: server trả 409 kèm lời giải thích. */
  leaveGroup: (id: string): Promise<void> =>
    unwrapEmpty(postApiV1GroupsByGroupIdLeave({ path: { groupId: id } })),

  lookupGroupCode: async (code: string): Promise<GroupSummary> =>
    toGroupSummary(await unwrap(postApiV1GroupsLookupCode({ body: { code } }))),

  getGroupInvites: async (): Promise<GroupInvites> => {
    const { invitations, rosters } = await unwrap(getApiV1MeGroupInvitations());
    return {
      invitations: invitations.map(({ id, groupId, groupName, expiresAt }) => ({
        id,
        groupId,
        groupName,
        initials: initialsOf(groupName),
        expiresAt,
      })),
      rosters: rosters.map(({ groupId, groupName }) => ({
        groupId,
        groupName,
        initials: initialsOf(groupName),
      })),
    };
  },

  answerInvitation: async (id: string, accept: boolean): Promise<void> => {
    if (accept) await unwrap(postApiV1GroupInvitationsByIdAccept({ path: { id } }));
    else await unwrapEmpty(postApiV1GroupInvitationsByIdDecline({ path: { id } }));
  },

  /** Tắt tiếng: thông báo của nhóm vẫn vào hộp thư, chỉ không nhắc. */
  getMutedGroupIds: async (): Promise<string[]> =>
    (await unwrap(getApiV1MeNotificationPreferences())).mutedGroupIds,

  setGroupMuted: (id: string, muted: boolean): Promise<void> =>
    unwrapEmpty(
      muted
        ? putApiV1MeGroupMutesByGroupId({ path: { groupId: id } })
        : deleteApiV1MeGroupMutesByGroupId({ path: { groupId: id } }),
    ),

  /** Mọi trạng thái trong một lượt — hai ngăn "Đang đăng" / "Đã bán" lọc từ cùng một danh sách. */
  getMyListings: async (load: LoadLookups): Promise<MyListing[]> => {
    const { items } = await unwrap(getApiV1MeListings({ query: { limit: MY_PAGE_SIZE } }));
    const lookups = await load(provincesOf(items));
    return items.flatMap((w) =>
      w.state === 'removed'
        ? []
        : [
            {
              ...toCard(w, lookups),
              state: w.state,
              views: null,
              saves: null,
              expiresAt: w.expiresAt,
              note: w.machineNotice?.message ?? w.faultReason ?? null,
              fixes: w.machineNotice?.fixes.map((fix) => fix.message) ?? [],
              lookupCode: w.machineNotice?.lookupCode ?? null,
              version: w.version,
              renewal: w.renewal,
              moveUntil: w.moveUntil,
            },
          ],
    );
  },

  markSold: async (id: string): Promise<void> => {
    await unwrap(postApiV1ListingsByIdSold({ path: { id } }));
  },

  /**
   * Gia hạn và chuyển lên chợ chung đi qua máy duyệt như một lượt gửi nên mang mã máy; chuyển lên chợ chung tạo tin
   * MỚI, tin cũ giữ nguyên. Xoá thì không ai thấy tin nữa, kể cả người đăng.
   */
  actOnMyListing: async (action: MyListingAction, l: MyListing): Promise<void> => {
    const path = { id: l.id };
    switch (action) {
      case 'withdraw':
        await unwrap(postApiV1ListingsByIdWithdraw({ path }));
        return;
      case 'renew':
        await unwrap(
          postApiV1ListingsByIdRenew({
            path,
            headers: deviceHeaders(),
            body: { version: l.version },
          }),
        );
        return;
      case 'move':
        await unwrap(
          postApiV1ListingsByIdMoveToMarketplace({ path, headers: deviceHeaders(), body: {} }),
        );
        return;
      case 'delete':
        await unwrapEmpty(deleteApiV1ListingsById({ path }));
    }
  },

  getTemplate: async (categoryId: string): Promise<TemplateField[]> =>
    (await unwrap(getApiV1CategoriesByIdTemplate({ path: { id: categoryId } }))).fields.map(
      (f) => ({ ...f, options: f.options ?? [] }),
    ),

  createDraft: async (): Promise<DraftRef> => toRef(await unwrap(postApiV1Listings({ body: {} }))),

  /** Lưu nháp, hoặc sửa tin đã gửi — server đưa nội dung đã sửa qua máy duyệt lại. */
  saveListing: async (ref: DraftRef, c: ListingContent): Promise<DraftRef> =>
    toRef(
      await unwrap(
        patchApiV1ListingsById({
          path: { id: ref.id },
          headers: deviceHeaders(),
          body: { version: ref.version, ...toContentBody(c) },
        }),
      ),
    ),

  submitListing: async (ref: DraftRef): Promise<void> => {
    await unwrap(
      postApiV1ListingsByIdSubmit({
        path: { id: ref.id },
        headers: deviceHeaders(),
        body: { version: ref.version },
      }),
    );
  },

  getEditable: async (id: string): Promise<EditableListing> =>
    toEditable(await unwrap(getApiV1ListingsById({ path: { id } }))),

  /** Ảnh chỉ thành ảnh của tin khi nháp được lưu kèm `imageId` trả về. */
  uploadPhoto: (listingId: string, photo: PickedPhoto): Promise<string> =>
    uploadImage({ kind: 'listing', id: listingId }, photo),

  getConversations: async (): Promise<ConversationSummary[]> =>
    (await unwrap(getApiV1MeConversations({ query: { limit: CONVERSATION_PAGE } }))).items.map(
      toSummary,
    ),

  /** Hội thoại + trang tin nhắn mới nhất; server trả mới trước, màn chat đọc theo thứ tự gửi. */
  getConversation: async (id: string): Promise<Conversation> => {
    const path = { conversationId: id };
    const [w, page] = await Promise.all([
      unwrap(getApiV1MeConversationsByConversationId({ path })),
      unwrap(
        getApiV1MeConversationsByConversationIdMessages({ path, query: { limit: MESSAGE_PAGE } }),
      ),
    ]);
    return {
      ...toSummary(w),
      messages: page.items.map(toMessage).toReversed(),
      isSeller: w.role === 'seller',
      canOffer: w.canOffer,
      readOnly: readOnlyOf(w),
    };
  },

  markConversationRead: (id: string): Promise<void> =>
    unwrapEmpty(postApiV1MeConversationsByConversationIdRead({ path: { conversationId: id } })),

  /** Máy này đang mở hội thoại: server không đẩy tin của nó lên máy này — cờ tự hết sau 10 phút. */
  setConversationViewing: (id: string, viewing: boolean): Promise<void> => {
    const path = { conversationId: id };
    return unwrapEmpty(
      viewing
        ? putApiV1MeConversationsByConversationIdViewing({ path })
        : deleteApiV1MeConversationsByConversationIdViewing({ path }),
    );
  },

  /** Chỉ xoá khỏi danh sách của mình — bên kia vẫn thấy đủ tin nhắn. */
  deleteConversation: (id: string): Promise<void> =>
    unwrapEmpty(deleteApiV1MeConversationsByConversationId({ path: { conversationId: id } })),

  /** Báo cáo bên kia từ hội thoại về tin; hội thoại với một đội (Hỗ trợ Ghim, quản trị nhóm) thì server trả 409. */
  reportConversation: async (id: string, category: ReportCategory): Promise<void> => {
    await unwrap(
      postApiV1MeConversationsByConversationIdReports({
        path: { conversationId: id },
        headers: deviceHeaders(),
        body: { category },
      }),
    );
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> =>
    toMessage(
      await unwrap(
        postApiV1MeConversationsByConversationIdMessages({
          path: { conversationId },
          body: { body: text },
        }),
      ),
    ),

  sendOffer: async (conversationId: string, amount: number): Promise<Message> =>
    toMessage(
      await unwrap(
        postApiV1MeConversationsByConversationIdOffers({
          path: { conversationId },
          body: { amount },
        }),
      ),
    ),

  /** Người bán trả lời đúng một lần mỗi đề nghị đang chờ (spec messaging/price-offers). */
  respondOffer: async (
    conversationId: string,
    messageId: string,
    decision: 'accepted' | 'declined',
  ): Promise<Message> => {
    const path = { conversationId, messageId };
    return toMessage(
      await unwrap(
        decision === 'accepted'
          ? postApiV1MeConversationsByConversationIdOffersByMessageIdAccept({ path })
          : postApiV1MeConversationsByConversationIdOffersByMessageIdDecline({ path }),
      ),
    );
  },

  /** Mở (hoặc mở lại) hội thoại theo ngữ cảnh — trả mã để route điều hướng tới `/chat/[id]`. */
  openConversation: async (to: ConversationTarget): Promise<string> => {
    if (to.kind === 'support') return (await unwrap(postApiV1MeSupportConversation())).id;
    if (to.kind === 'listing') {
      return (
        await unwrap(postApiV1ListingsByListingIdConversation({ path: { listingId: to.id } }))
      ).id;
    }
    return (await unwrap(postApiV1GroupsByGroupIdConversation({ path: { groupId: to.id } }))).id;
  },

  /**
   * Tài khoản mới ở trạng thái chờ xác nhận và mã 6 số đã gửi tới email: đăng nhập được ngay, nhưng đăng tin, tải
   * ảnh, nhắn tin, vào nhóm đều bị chặn (`EMAIL_NOT_VERIFIED`) tới khi nhập mã.
   */
  register: async (r: Registration): Promise<void> => {
    await unwrap(
      postApiV1AuthRegister({
        body: { email: r.email.trim(), password: r.password, displayName: r.displayName.trim() },
      }),
    );
  },

  verifyEmail: (email: string, code: string): Promise<void> =>
    unwrapEmpty(postApiV1AuthVerifyEmail({ body: { email: email.trim(), code } })),

  /** Server trả 200 cả khi email chưa đăng ký hay đã xác nhận — không lộ ai có tài khoản; gửi quá dày thì 429. */
  resendCode: (email: string): Promise<void> =>
    unwrapEmpty(postApiV1AuthResendCode({ body: { email: email.trim() } })),

  /** Như `resendCode`: trả lời giống nhau dù email có tài khoản hay không. */
  forgotPassword: (email: string): Promise<void> =>
    unwrapEmpty(postApiV1AuthForgotPassword({ body: { email: email.trim() } })),

  /** Đặt lại mật khẩu thu hồi mọi phiên của tài khoản. */
  resetPassword: (email: string, code: string, password: string): Promise<void> =>
    unwrapEmpty(postApiV1AuthResetPassword({ body: { email: email.trim(), code, password } })),

  /** Mang mã máy như lượt gửi tin: server ghi dấu đăng nhập cho luật "không xử việc của tài khoản chung máy". */
  login: (email: string, password: string): Promise<Session> =>
    unwrap(
      postApiV1AuthLogin({ headers: deviceHeaders(), body: { email, password, client: 'app' } }),
    ).then(toSession),

  refresh: (refreshToken: string): Promise<Session> =>
    unwrap(postApiV1AuthRefresh({ body: { refreshToken } })).then(toSession),

  /** Thu hồi phiên hiện tại trên server (theo Bearer) — các thiết bị khác của tài khoản không bị ảnh hưởng. */
  logout: (): Promise<void> => unwrapEmpty(postApiV1AuthLogout()),
};
