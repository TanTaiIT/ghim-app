import type {
  Conversation,
  ConversationSummary,
  Group,
  GroupMember,
  GroupSummary,
  HelpTopic,
  ListingCard,
  ListingDetail,
  Message,
  Notice,
  OfferStatus,
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

const wait = <T>(value: T, ms = LATENCY_MS) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const notFound = (what: string) => new ApiError('NOT_FOUND', `Không tìm thấy ${what}`, 404);

const listings = D.LISTINGS;
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

const publicListings = () => listings.map(toCard);

const byNewest = (a: ListingCard, b: ListingCard) => b.postedAt.localeCompare(a.postedAt);

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

export const mockApi = {
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
      // Tin thật của server (màn chi tiết đã nối backend) chưa mở chat được: tin nhắn vẫn là dữ liệu mẫu.
      if (!l) {
        throw new ApiError('NOT_AVAILABLE', 'Chat với người bán sẽ có khi nối phần tin nhắn', 501);
      }
      const id = nextId('c');
      const { id: lid, title, price, cover } = l;
      const { id: sellerId, name, verified } = l.seller;
      conversations = [
        {
          id,
          peer: { id: sellerId, name, verified, online: false },
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
