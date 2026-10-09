import { getHealthReady } from './generated/sdk.gen';
import { ApiError } from './http';

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
 * Chỗ duy nhất bóc vỏ response và đổi mọi nhánh hỏng thành `ApiError`.
 *
 * SDK không throw mà trả `{ data, error }`; backend lại trả vỏ ở CẢ hai nhánh (503 của readiness vẫn là
 * `success: true`). Đọc `data ?? error` rồi phân nhánh theo `success` là cách duy nhất không bỏ sót nhánh
 * nào. Không có vỏ nghĩa là chưa tới được server: mạng đứt, proxy trả HTML, server chết giữa chừng.
 */
export async function unwrap<T>(call: Promise<SdkResult<{ success: true; data: T }>>): Promise<T> {
  const { data, error, response } = await call;
  const body: unknown = data ?? error;
  if (isEnvelope(body)) {
    if (body.success) return body.data as T;
    throw new ApiError(
      body.error.code,
      body.error.message,
      response?.status ?? 0,
      body.error.details,
    );
  }
  throw new ApiError(
    'NETWORK_ERROR',
    'Không kết nối được tới máy chủ, kiểm tra mạng rồi thử lại',
    response?.status ?? 0,
  );
}

/* ------------------------------- domain type ------------------------------- */

export type Readiness = { database: 'up' | 'down' };

/*
 * Các type dưới đây là hợp đồng mà màn hình đang dùng với dữ liệu mẫu (`./mock`). Khi ghim-server mở
 * `add-listings` / `add-groups` / `add-messaging`, mapper wire → domain ở file này phải trả đúng hình
 * dạng này để màn hình không đổi.
 */

/**
 * Ảnh hiển thị. `svg` chỉ có ở dữ liệu mẫu — ảnh minh hoạ vẽ sẵn thay cho ảnh người bán tới khi backend
 * có `add-media`; lúc đó xoá nhánh này cùng `./mock-art`.
 */
export type Picture = { uri: string } | { svg: string };

export const CONDITIONS = ['new', 'like-new', 'used'] as const;

export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABEL: Record<Condition, string> = {
  new: 'Mới',
  'like-new': 'Như mới',
  used: 'Đã dùng',
};

const CATEGORY_IDS = [
  'phone',
  'laptop',
  'fashion',
  'furniture',
  'vehicle',
  'property',
  'jobs',
  'camera',
  'electronics',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Route param / chuỗi trong nháp → `CategoryId`. Chuỗi lạ (deep link sai) thành null, không ép kiểu. */
export function toCategoryId(value: string | null | undefined): CategoryId | null {
  return CATEGORY_IDS.find((id) => id === value) ?? null;
}

export type Category = {
  id: CategoryId;
  name: string;
  /** Ô thông số người đăng điền ở bước 2 — mỗi danh mục hỏi một bộ khác. */
  specKeys: string[];
};

export type Place = { district: string; city: string };

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
  seller: Person;
  /** Nhóm mà tin được đăng vào — mục "Gần bạn" gắn nhãn để người xem biết tin đến từ đâu. */
  groupName: string | null;
};

export type Seller = Person & {
  rating: number;
  deals: number;
  replyMinutes: number;
  /** Tuỳ chọn và chưa xác minh (add-identity: identity/profile). */
  phone: string | null;
};

export type ListingDetail = ListingCard & {
  seller: Seller;
  condition: Condition;
  category: { id: CategoryId; name: string };
  brand: string | null;
  photos: Picture[];
  specs: { label: string; value: string }[];
  description: string;
  views: number;
  allowOffers: boolean;
};

export type CategorySuggestion = { category: Category; brand: string | null };

export type SortOrder = 'newest' | 'price-asc' | 'price-desc';

export type SearchFilters = {
  q: string;
  categoryId: CategoryId | null;
  city: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  condition: Condition | null;
  sort: SortOrder;
};

type MyListingState = 'pending' | 'active' | 'sold';

export type MyListing = ListingCard & {
  state: MyListingState;
  views: number;
  saves: number;
  expiresAt: string;
};

export type PriceHint = { min: number; max: number };

export type BoostPlan = {
  id: string;
  name: string;
  note: string;
  /** null khi giá gói chưa chốt — thiết kế gốc để trống chỗ này. */
  price: number | null;
};

export type NewListing = {
  title: string;
  categoryId: CategoryId;
  condition: Condition;
  price: number;
  allowOffers: boolean;
  specs: { label: string; value: string }[];
  description: string;
  place: Place;
  groupIds: string[];
  photos: Picture[];
  boostId: string | null;
};

export type GroupSummary = {
  id: string;
  name: string;
  initials: string;
  /** Nhóm kín: tin đăng vào chỉ thành viên thấy; nhóm công khai: tin hiện cả khi tìm kiếm. */
  visibility: 'public' | 'private';
};

export type Group = GroupSummary & {
  memberCount: number;
  joined: boolean;
  cover: Picture;
  pinnedRule: string | null;
  about: string;
};

export type GroupMember = Person & { role: 'admin' | 'member' };

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'superseded';

export type Message =
  | { id: string; kind: 'text'; mine: boolean; text: string; at: string }
  | { id: string; kind: 'offer'; mine: boolean; amount: number; status: OfferStatus; at: string };

export type Peer = Person & { online: boolean };

type ListingRef = Pick<ListingCard, 'id' | 'title' | 'price' | 'cover'>;

export type ConversationSummary = {
  id: string;
  peer: Peer;
  /** null với hội thoại không gắn tin nào — nhắn admin nhóm, nhắn hỗ trợ. */
  listing: ListingRef | null;
  lastMessage: string;
  at: string;
  unread: number;
};

export type Conversation = Pick<ConversationSummary, 'id' | 'peer' | 'listing'> & {
  messages: Message[];
};

export type NoticeTab = 'deal' | 'promo' | 'system';

export type NoticeKind = 'offer' | 'search' | 'expiring' | 'approved' | 'group' | 'promo';

export type NoticeTarget =
  | { screen: 'chat'; id: string }
  | { screen: 'search'; q: string }
  | { screen: 'profile' }
  | { screen: 'listing'; id: string }
  | { screen: 'group'; id: string }
  | { screen: 'post' };

export type Notice = {
  id: string;
  tab: NoticeTab;
  kind: NoticeKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Nhãn nút hành động trên thông báo; null = cả thẻ là nút. */
  action: string | null;
  target: NoticeTarget;
};

export type Me = Person & {
  idVerified: boolean;
  memberSince: number;
  /** Khu vực mặc định khi đăng tin và khi tìm kiếm. */
  place: Place;
  rating: number;
  stats: { active: number; sold: number; saved: number };
  groups: GroupSummary[];
};

export type HelpTopic = { id: string; label: string; faqs: { q: string; a: string }[] };

export type Session = {
  accountId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
};

/* ---------------------------------- api ----------------------------------- */

export const api = {
  getReadiness: (): Promise<Readiness> => unwrap(getHealthReady()),
};
