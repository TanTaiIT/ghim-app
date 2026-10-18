import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  getApiV1Categories,
  getApiV1CategoriesByIdTemplate,
  getApiV1CategoriesByIdTemplateVersionsByVersion,
  getApiV1Listings,
  getApiV1ListingsById,
  getApiV1ListingsByIdSuggestions,
  getApiV1Me,
  getApiV1MeListings,
  getApiV1RegionsProvinces,
  getApiV1RegionsProvincesByCodeWards,
  getApiV1UsersById,
  getHealthReady,
  patchApiV1ListingsById,
  postApiV1AuthLogin,
  postApiV1AuthLogout,
  postApiV1AuthRefresh,
  postApiV1Listings,
  postApiV1ListingsByIdSold,
  postApiV1ListingsByIdSubmit,
  postApiV1MediaUploads,
} from './generated/sdk.gen';
import type {
  GetApiV1ListingsByIdResponses,
  GetApiV1ListingsResponses,
  GetApiV1MeResponses,
  GetApiV1UsersByIdResponses,
} from './generated/types.gen';
import { ApiError, deviceHeaders } from './http';

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
};

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
  email: string;
  idVerified: boolean;
  memberSince: number;
  /** Khu vực mặc định khi đăng tin và khi tìm kiếm — server chưa lưu, nên null với tài khoản thật. */
  place: Place | null;
  rating: number | null;
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
type WireMe = GetApiV1MeResponses[200]['data'];

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
 * "chưa điền" — lượt gửi duyệt sẽ không báo thiếu tiêu đề. Luôn `marketplace`: đăng vào nhóm cần domain nhóm
 * thật, mà nhóm vẫn là dữ liệu mẫu.
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
    placement: 'marketplace' as const,
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
    photos: w.images.map((img) => ({ imageId: img.id, uri: img.url })),
  };
}

/** Màn rộng nhất ~430pt × 3 = 1290px; 1600 đủ cho màn chi tiết và phóng nhẹ. */
const PHOTO_MAX_EDGE = 1600;
const PHOTO_QUALITY = 0.75;

/**
 * Luôn vẽ lại thành JPEG, kể cả ảnh đã nhỏ: iPhone trả HEIC nguyên bản mà server từ chối, và lượt vẽ lại là
 * thứ gỡ EXIF — trong đó có toạ độ GPS chỗ chụp, thường là nhà người bán; ảnh đi thẳng vào kho nên server
 * không gỡ hộ được. Nén hỏng thì để lỗi nổi lên, không tải ảnh gốc (`docs/media.md` bước 1).
 */
async function preparePhoto(p: PickedPhoto): Promise<string> {
  const context = ImageManipulator.manipulate(p.uri);
  if (Math.max(p.width, p.height) > PHOTO_MAX_EDGE) {
    context.resize(p.width >= p.height ? { width: PHOTO_MAX_EDGE } : { height: PHOTO_MAX_EDGE });
  }
  const image = await context.renderAsync();
  return (await image.saveAsync({ compress: PHOTO_QUALITY, format: SaveFormat.JPEG })).uri;
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

  getMe: async (): Promise<Me> => toMe(await unwrap(getApiV1Me())),

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
            },
          ],
    );
  },

  markSold: async (id: string): Promise<void> => {
    await unwrap(postApiV1ListingsByIdSold({ path: { id } }));
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

  /**
   * Nén → xin quyền tải cho đúng một ảnh → tải thẳng lên kho (`ghim-server/docs/media.md`). Ảnh chỉ thành
   * ảnh của tin khi nháp được lưu kèm `imageId`; không lưu trong 48 giờ thì server dọn.
   */
  uploadPhoto: async (listingId: string, photo: PickedPhoto): Promise<string> => {
    const { body, size } = await fileOf(await preparePhoto(photo));
    const grant = await unwrap(
      postApiV1MediaUploads({
        body: {
          ownerKind: 'listing',
          ownerId: listingId,
          contentType: 'image/jpeg',
          byteSize: size,
        },
      }),
    );
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
  },

  login: (email: string, password: string): Promise<Session> =>
    unwrap(postApiV1AuthLogin({ body: { email, password, client: 'app' } })).then(toSession),

  refresh: (refreshToken: string): Promise<Session> =>
    unwrap(postApiV1AuthRefresh({ body: { refreshToken } })).then(toSession),

  /** Thu hồi phiên hiện tại trên server (theo Bearer) — các thiết bị khác của tài khoản không bị ảnh hưởng. */
  logout: (): Promise<void> => unwrapEmpty(postApiV1AuthLogout()),
};
