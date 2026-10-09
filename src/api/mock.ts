import type {
  BoostPlan,
  Category,
  CategoryId,
  CategorySuggestion,
  Conversation,
  ConversationSummary,
  Group,
  GroupMember,
  GroupSummary,
  HelpTopic,
  ListingCard,
  ListingDetail,
  Me,
  Message,
  MyListing,
  NewListing,
  Notice,
  OfferStatus,
  Picture,
  PriceHint,
  SearchFilters,
  Session,
} from './client';
import { ApiError } from './http';
import * as D from './mock-data';
import { formatVnd } from '@/utils/format';

/*
 * API giả cho giai đoạn chưa có backend: cùng chữ ký mà `api` trong `./client` sẽ có. Đổi sang backend
 * thật = thay `mockApi.x` bằng `api.x` trong `src/queries/**`; màn hình không phải sửa.
 *
 * Trạng thái nằm trong bộ nhớ của module (mất khi reload app) và mọi hàm ghi đều thay object mới chứ
 * không sửa tại chỗ — TanStack giữ tham chiếu tới dữ liệu cũ trong cache, sửa tại chỗ là đổi lén dữ
 * liệu mà cache tưởng chưa đổi.
 */

/** Đủ để thấy trạng thái loading và để optimistic update có ý nghĩa, không đủ để thấy chậm. */
const LATENCY_MS = 350;
const DAY_MS = 24 * 60 * 60_000;

const wait = <T>(value: T, ms = LATENCY_MS) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const notFound = (what: string) => new ApiError('NOT_FOUND', `Không tìm thấy ${what}`, 404);

let listings = D.LISTINGS;
let shelf = D.MY_SHELF;
let sold = D.MY_SOLD;
let savedIds = D.SAVED_IDS;
let savedSearches: string[] = [];
let groups = D.GROUPS;
let conversations = D.CONVERSATIONS;
let notices = D.NOTICES;
let seq = 0;

type Thread = Conversation & { unread: number };

const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

function toCard(l: ListingDetail): ListingCard {
  const { id, title, price, cover, place, postedAt, boosted, seller, groupName } = l;
  const { id: sellerId, name, verified } = seller;
  return {
    id,
    title,
    price,
    cover,
    place,
    postedAt,
    boosted,
    groupName,
    seller: { id: sellerId, name, verified },
  };
}

/** Tin đã đăng nhưng chưa duyệt hoặc đã bán không lên sàn. */
const publicListings = () =>
  listings.filter((l) => (shelf[l.id]?.state ?? 'active') === 'active').map(toCard);

const byNewest = (a: ListingCard, b: ListingCard) => b.postedAt.localeCompare(a.postedAt);

function matches(l: ListingDetail, f: SearchFilters): boolean {
  const q = f.q.trim().toLowerCase();
  return (
    (q === '' || l.title.toLowerCase().includes(q)) &&
    (f.categoryId === null || l.category.id === f.categoryId) &&
    (f.city === null || l.place.city === f.city) &&
    (f.minPrice === null || l.price >= f.minPrice) &&
    (f.maxPrice === null || l.price <= f.maxPrice) &&
    (f.condition === null || l.condition === f.condition)
  );
}

function preview(m: Message | undefined): string {
  if (!m) return '';
  if (m.kind === 'text') return m.text;
  return `${m.mine ? 'Bạn' : 'Người bán'} đề xuất giá ${formatVnd(m.amount)}`;
}

function summarize(c: Thread): ConversationSummary {
  const last = c.messages[c.messages.length - 1];
  return {
    id: c.id,
    peer: c.peer,
    listing: c.listing,
    lastMessage: preview(last),
    at: last?.at ?? new Date().toISOString(),
    unread: c.unread,
  };
}

function patchConversation(id: string, fn: (c: Thread) => Thread) {
  if (!conversations.some((c) => c.id === id)) throw notFound('hội thoại');
  conversations = conversations.map((c) => (c.id === id ? fn(c) : c));
}

const toMine = (l: ListingDetail): MyListing | null => {
  const s = shelf[l.id];
  return s ? { ...toCard(l), ...s } : null;
};

/** Từ khoá → danh mục. Backend thật sẽ phân loại bằng máy duyệt; đây chỉ đủ cho luồng đăng tin chạy. */
const KEYWORDS: { re: RegExp; id: CategoryId; brand: string | null }[] = [
  { re: /iphone/i, id: 'phone', brand: 'Apple' },
  { re: /samsung|xiaomi|oppo|điện thoại/i, id: 'phone', brand: null },
  { re: /macbook/i, id: 'laptop', brand: 'Apple' },
  { re: /laptop|dell|thinkpad|asus/i, id: 'laptop', brand: null },
  { re: /máy ảnh|ống kính|lens|fujifilm|canon|sony a/i, id: 'camera', brand: null },
  { re: /xe|honda|yamaha|vision/i, id: 'vehicle', brand: null },
  { re: /bàn|ghế|tủ|sofa|giường/i, id: 'furniture', brand: null },
  { re: /áo|quần|giày|váy|túi/i, id: 'fashion', brand: null },
];

const PRICE_HINTS: Partial<Record<CategoryId, PriceHint>> = {
  phone: { min: 10_000_000, max: 15_000_000 },
  laptop: { min: 13_000_000, max: 15_000_000 },
  camera: { min: 2_000_000, max: 12_000_000 },
  vehicle: { min: 18_000_000, max: 26_000_000 },
};

export const mockApi = {
  login: async (email: string, password: string): Promise<Session> => {
    if (password.length < 8) throw new ApiError('VALIDATION_ERROR', 'Mật khẩu từ 8 ký tự', 400);
    return wait({
      accountId: D.ME_ID,
      email,
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
    });
  },

  getMe: (): Promise<Me> => {
    const active = Object.values(shelf).filter((s) => s.state !== 'sold').length;
    return wait({
      ...D.ME,
      stats: { active, sold: sold.length, saved: savedIds.length },
    });
  },

  getCategories: (): Promise<Category[]> => wait(D.CATEGORIES),
  getDistricts: (): Promise<string[]> => wait(D.DISTRICTS),

  suggestCategory: (title: string): Promise<CategorySuggestion | null> => {
    const hit = KEYWORDS.find((k) => k.re.test(title));
    const category = hit && D.CATEGORIES.find((c) => c.id === hit.id);
    return wait(hit && category ? { category, brand: hit.brand } : null);
  },

  getPriceHint: (categoryId: CategoryId): Promise<PriceHint | null> =>
    wait(PRICE_HINTS[categoryId] ?? null),

  getBoostPlans: (): Promise<BoostPlan[]> => wait(D.BOOST_PLANS),

  /** Thay cho thư viện ảnh của máy: chọn ảnh thật cần `expo-image-picker` + chữ ký upload (`add-media`). */
  getSamplePhotos: (): Promise<Picture[]> =>
    wait(D.LISTINGS.flatMap((l) => l.photos).slice(0, 12), 0),

  getFeatured: (): Promise<ListingCard[]> =>
    wait(
      publicListings()
        .filter((l) => l.boosted)
        .sort(byNewest),
    ),

  getNearby: (): Promise<ListingCard[]> =>
    wait(publicListings().filter((l) => ['l-vision', 'l-desk', 'l-xt30'].includes(l.id))),

  search: (f: SearchFilters): Promise<ListingCard[]> => {
    const hits = listings.filter((l) => matches(l, f)).map(toCard);
    const ids = new Set(publicListings().map((l) => l.id));
    const visible = hits.filter((l) => ids.has(l.id));
    if (f.sort === 'price-asc') visible.sort((a, b) => a.price - b.price);
    else if (f.sort === 'price-desc') visible.sort((a, b) => b.price - a.price);
    else visible.sort(byNewest);
    return wait(visible);
  },

  getListing: async (id: string): Promise<ListingDetail> => {
    const l = listings.find((x) => x.id === id);
    if (!l) throw notFound('tin đăng');
    return wait(l);
  },

  getSimilar: async (id: string): Promise<ListingCard[]> => {
    const l = listings.find((x) => x.id === id);
    if (!l) throw notFound('tin đăng');
    return wait(
      publicListings().filter(
        (x) => x.id !== id && listings.find((y) => y.id === x.id)?.category.id === l.category.id,
      ),
    );
  },

  getSavedIds: (): Promise<string[]> => wait(savedIds, 150),

  setSaved: (id: string, saved: boolean): Promise<void> => {
    savedIds = saved ? [...new Set([...savedIds, id])] : savedIds.filter((x) => x !== id);
    return wait(undefined);
  },

  getSavedListings: (): Promise<ListingCard[]> =>
    wait(listings.filter((l) => savedIds.includes(l.id)).map(toCard)),

  getSavedSearches: (): Promise<string[]> => wait(savedSearches, 150),

  saveSearch: (q: string): Promise<void> => {
    savedSearches = [...new Set([...savedSearches, q.trim().toLowerCase()])];
    return wait(undefined);
  },

  reportListing: (_id: string, _reason: string): Promise<void> => wait(undefined),

  getMyListings: (state: 'active' | 'sold'): Promise<MyListing[]> => {
    if (state === 'sold') return wait(sold);
    const mine = listings.map(toMine).filter((m): m is MyListing => m !== null);
    return wait(mine.filter((m) => m.state !== 'sold').sort(byNewest));
  },

  markSold: async (id: string): Promise<void> => {
    const l = listings.find((x) => x.id === id);
    const s = shelf[id];
    if (!l || !s) throw notFound('tin đăng');
    sold = [{ ...toCard(l), ...s, state: 'sold' }, ...sold];
    shelf = { ...shelf, [id]: { ...s, state: 'sold' } };
    return wait(undefined);
  },

  publishListing: async (input: NewListing): Promise<MyListing> => {
    const cover = input.photos[0];
    if (!cover) throw new ApiError('VALIDATION_ERROR', 'Tin cần ít nhất một ảnh', 400);
    const category = D.CATEGORIES.find((c) => c.id === input.categoryId);
    if (!category) throw new ApiError('VALIDATION_ERROR', 'Danh mục không hợp lệ', 400);
    const me = await mockApi.getMe();
    const id = nextId('l');
    const now = Date.now();
    const detail: ListingDetail = {
      id,
      title: input.title,
      price: input.price,
      cover,
      place: input.place,
      postedAt: new Date(now).toISOString(),
      boosted: input.boostId !== null,
      seller: {
        id: me.id,
        name: me.name,
        verified: me.verified,
        rating: me.rating,
        deals: 0,
        replyMinutes: 10,
        phone: null,
      },
      groupName: null,
      condition: input.condition,
      category: { id: category.id, name: category.name },
      brand: null,
      photos: input.photos,
      specs: input.specs,
      description: input.description,
      views: 0,
      allowOffers: input.allowOffers,
    };
    const entry = {
      state: 'pending' as const,
      views: 0,
      saves: 0,
      expiresAt: new Date(now + 30 * DAY_MS).toISOString(),
    };
    listings = [detail, ...listings];
    shelf = { ...shelf, [id]: entry };
    return wait({ ...toCard(detail), ...entry });
  },

  getMyGroups: (): Promise<GroupSummary[]> =>
    wait(
      groups
        .filter((g) => g.joined)
        .map(({ id, name, initials, visibility }) => ({ id, name, initials, visibility })),
    ),

  getGroup: async (id: string): Promise<Group> => {
    const g = groups.find((x) => x.id === id);
    if (!g) throw notFound('nhóm');
    return wait(g);
  },

  getGroupListings: async (id: string): Promise<ListingCard[]> => {
    const g = groups.find((x) => x.id === id);
    if (!g) throw notFound('nhóm');
    return wait(
      publicListings()
        .filter((l) => l.groupName === g.name)
        .sort(byNewest),
    );
  },

  getGroupMembers: (_id: string): Promise<GroupMember[]> => wait(D.GROUP_MEMBERS),

  setGroupJoined: async (id: string, joined: boolean): Promise<void> => {
    if (!groups.some((g) => g.id === id)) throw notFound('nhóm');
    groups = groups.map((g) =>
      g.id === id ? { ...g, joined, memberCount: g.memberCount + (joined ? 1 : -1) } : g,
    );
    return wait(undefined);
  },

  getConversations: (): Promise<ConversationSummary[]> =>
    wait(conversations.map(summarize).sort((a, b) => b.at.localeCompare(a.at))),

  getConversation: async (id: string): Promise<Conversation> => {
    const c = conversations.find((x) => x.id === id);
    if (!c) throw notFound('hội thoại');
    return wait({ id: c.id, peer: c.peer, listing: c.listing, messages: c.messages });
  },

  markConversationRead: async (id: string): Promise<void> => {
    patchConversation(id, (c) => ({ ...c, unread: 0 }));
    return wait(undefined, 100);
  },

  /** Tìm hội thoại sẵn có cho đúng ngữ cảnh, chưa có thì tạo — trả id để màn hình mở. */
  openConversation: async (
    to: { kind: 'listing'; id: string } | { kind: 'group'; id: string } | { kind: 'support' },
  ): Promise<string> => {
    if (to.kind === 'listing') {
      const found = conversations.find((c) => c.listing?.id === to.id);
      if (found) return wait(found.id);
      const l = listings.find((x) => x.id === to.id);
      if (!l) throw notFound('tin đăng');
      const id = nextId('c');
      const { id: lid, title, price, cover } = l;
      conversations = [
        {
          id,
          peer: { ...toCard(l).seller, online: false },
          listing: { id: lid, title, price, cover },
          unread: 0,
          messages: [],
        },
        ...conversations,
      ];
      return wait(id);
    }
    const peerId = to.kind === 'support' ? D.SUPPORT.id : `admin-${to.id}`;
    const found = conversations.find((c) => c.peer.id === peerId);
    if (found) return wait(found.id);
    const group = to.kind === 'group' ? groups.find((g) => g.id === to.id) : undefined;
    const peer =
      to.kind === 'support'
        ? D.SUPPORT
        : { id: peerId, name: `Admin · ${group?.name ?? 'nhóm'}`, verified: true, online: false };
    const greeting: Message = {
      id: nextId('m'),
      kind: 'text',
      mine: false,
      text: 'Chào bạn, admin có thể giúp gì cho bạn?',
      at: new Date().toISOString(),
    };
    const id = nextId('c');
    conversations = [
      { id, peer, listing: null, unread: 0, messages: [greeting] },
      ...conversations,
    ];
    return wait(id);
  },

  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    const message: Message = {
      id: nextId('m'),
      kind: 'text',
      mine: true,
      text,
      at: new Date().toISOString(),
    };
    patchConversation(conversationId, (c) => ({ ...c, messages: [...c.messages, message] }));
    return wait(message);
  },

  /** Đề xuất giá mới làm mọi đề xuất còn treo trước đó thành "superseded" — chỉ một giá được bàn. */
  sendOffer: async (conversationId: string, amount: number): Promise<Message> => {
    const offer: Message = {
      id: nextId('m'),
      kind: 'offer',
      mine: true,
      amount,
      status: 'pending',
      at: new Date().toISOString(),
    };
    patchConversation(conversationId, (c) => ({
      ...c,
      messages: [
        ...c.messages.map((m) =>
          m.kind === 'offer' && m.status === 'pending'
            ? { ...m, status: 'superseded' as const }
            : m,
        ),
        offer,
      ],
    }));
    return wait(offer);
  },

  respondOffer: async (
    conversationId: string,
    messageId: string,
    status: Exclude<OfferStatus, 'superseded'>,
  ): Promise<void> => {
    patchConversation(conversationId, (c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === messageId && m.kind === 'offer' ? { ...m, status } : m,
      ),
    }));
    return wait(undefined);
  },

  getNotices: (): Promise<Notice[]> => wait(notices),

  markAllNoticesRead: (): Promise<void> => {
    notices = notices.map((n) => ({ ...n, read: true }));
    return wait(undefined);
  },

  getHelpTopics: (): Promise<HelpTopic[]> => wait(D.HELP_TOPICS),
};
