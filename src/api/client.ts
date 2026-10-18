import {
  getApiV1Categories,
  getApiV1CategoriesByIdTemplateVersionsByVersion,
  getApiV1Listings,
  getApiV1ListingsById,
  getApiV1ListingsByIdSuggestions,
  getApiV1RegionsProvinces,
  getApiV1RegionsProvincesByCodeWards,
  getApiV1UsersById,
  getHealthReady,
  postApiV1AuthLogin,
  postApiV1AuthLogout,
  postApiV1AuthRefresh,
} from './generated/sdk.gen';
import type { GetApiV1ListingsResponses, GetApiV1UsersByIdResponses } from './generated/types.gen';
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

/** Danh mục của server: uuid do master tạo lúc chạy — không có bộ khoá cố định nào để app dựa vào. */
export type Category = { id: string; name: string };

/*
 * Danh mục của luồng đăng tin vẫn là dữ liệu mẫu tới khi nối đăng tin thật: slug cố định, mỗi danh mục một
 * bộ ô thông số. Server thay bộ ô đó bằng mẫu thông số theo phiên bản (`/categories/{id}/template`).
 */
const POST_CATEGORY_IDS = [
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

export type PostCategoryId = (typeof POST_CATEGORY_IDS)[number];

/** Chuỗi trong nháp → `PostCategoryId`. Chuỗi lạ thành null, không ép kiểu. */
export function toPostCategoryId(value: string | null | undefined): PostCategoryId | null {
  return POST_CATEGORY_IDS.find((id) => id === value) ?? null;
}

export type PostCategory = {
  id: PostCategoryId;
  name: string;
  /** Ô thông số người đăng điền ở bước 2 — mỗi danh mục hỏi một bộ khác. */
  specKeys: string[];
};

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

export type CategorySuggestion = { category: PostCategory; brand: string | null };

/** Đúng bộ lọc mà `GET /listings` nhận — server chưa có sắp xếp hay lọc theo tình trạng. */
export type SearchFilters = {
  q: string;
  categoryId: string | null;
  provinceCode: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export const NO_FILTERS: SearchFilters = {
  q: '',
  categoryId: null,
  provinceCode: null,
  minPrice: null,
  maxPrice: null,
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
  categoryId: PostCategoryId;
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

export type Session = { accessToken: string; refreshToken: string };

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

/** Trang đầu đủ cho trang chủ và một màn kết quả; cuộn tải thêm (`nextCursor`) chưa làm. */
const PAGE_SIZE = 30;

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
  };
}

async function toCards(items: WireListing[], load: LoadLookups): Promise<ListingCard[]> {
  const provinces = [
    ...new Set(items.flatMap((w) => (w.provinceCode === null ? [] : [w.provinceCode]))),
  ];
  const lookups = await load(provinces);
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

  login: (email: string, password: string): Promise<Session> =>
    unwrap(postApiV1AuthLogin({ body: { email, password, client: 'app' } })).then(toSession),

  refresh: (refreshToken: string): Promise<Session> =>
    unwrap(postApiV1AuthRefresh({ body: { refreshToken } })).then(toSession),

  /** Thu hồi phiên hiện tại trên server (theo Bearer) — các thiết bị khác của tài khoản không bị ảnh hưởng. */
  logout: (): Promise<void> => unwrapEmpty(postApiV1AuthLogout()),
};
