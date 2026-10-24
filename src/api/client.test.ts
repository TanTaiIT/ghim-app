import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  api,
  myListingActions,
  NO_FILTERS,
  unwrap,
  unwrapEmpty,
  type Lookups,
  type MyListing,
} from './client';
import { ApiError, setHttpAccessToken, setHttpDeviceId } from './http';

const response = (status: number) => ({ status, ok: status >= 200 && status < 300 }) as Response;

/** Đúng hình dạng một tin công khai của `GET /listings` (ghim-server `fa49f3a`). */
const wireListing = {
  id: '01a1312e-959f-7011-aed7-98a4ad9322d8',
  ownerId: 'u-1',
  state: 'live',
  placement: 'marketplace',
  groupId: null,
  title: 'Bàn học gỗ sồi',
  description: 'Còn mới',
  price: 300000,
  negotiable: true,
  delivery: false,
  showPhone: false,
  categoryId: 'c-1',
  templateVersion: 1,
  attributes: { hang: 'Apple', mau: ['Đen', 'Bạc'], ghi_chu: '' },
  provinceCode: 1,
  wardCode: 4,
  images: [{ id: 'i-1', url: 'https://img.test/1.jpg' }],
  badge: { groupId: 'g-1', name: 'Hội Nhiếp ảnh' },
  firstLiveAt: '2026-10-12T17:35:01.494Z',
  featuredUntil: null,
  expiresAt: null,
  createdAt: '2026-10-12T17:00:00.000Z',
  updatedAt: '2026-10-12T17:35:01.494Z',
};

const lookups: Lookups = {
  category: (id) => (id === 'c-1' ? { id, name: 'Nội thất' } : null),
  place: () => ({ ward: 'Phường Ba Đình', province: 'Hà Nội' }),
};
const loadLookups = async () => lookups;

const wireMe = {
  id: 'u-1',
  displayName: 'Tài Nguyễn',
  avatarUrl: null,
  joinedAt: '2026-10-18T00:00:00.000Z',
  phone: null,
  email: 'app.dev@ghim.local',
  emailVerified: true,
  role: 'user',
  staff: false,
  nameHidden: false,
};

/** Server giả theo đường dẫn; ghi lại URL và header phiên của từng lượt gọi. */
function serve(routes: Record<string, unknown>) {
  const calls: { url: URL; authorization: string | null }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const url = new URL(req.url);
    calls.push({ url, authorization: req.headers.get('authorization') });
    const data = routes[url.pathname];
    return new Response(
      JSON.stringify(data === undefined ? { success: false } : { success: true, data }),
      {
        status: data === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });
  return calls;
}

describe('đọc tin đăng từ server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setHttpAccessToken(null);
  });

  it('thẻ tin: tra tên khu vực qua lookups, ảnh đầu làm bìa, chưa có người bán; bộ lọc thành query', async () => {
    const calls = serve({ '/api/v1/listings': { items: [wireListing], nextCursor: null } });
    const load = jest.fn(async (_codes: number[]) => lookups);

    const [card] = await api.searchListings({ ...NO_FILTERS, q: '  bàn ', provinceCode: 1 }, load);

    expect(card).toEqual({
      id: wireListing.id,
      title: 'Bàn học gỗ sồi',
      price: 300000,
      cover: { uri: 'https://img.test/1.jpg' },
      place: { ward: 'Phường Ba Đình', province: 'Hà Nội' },
      postedAt: '2026-10-12T17:35:01.494Z',
      boosted: false,
      seller: null,
      groupName: 'Hội Nhiếp ảnh',
    });
    expect(load).toHaveBeenCalledWith([1]);
    expect(calls[0]?.url.searchParams.get('q')).toBe('bàn');
    expect(calls[0]?.url.searchParams.get('provinceCode')).toBe('1');
    expect(calls[0]?.url.searchParams.has('categoryId')).toBe(false);
  });

  // Route xem tin trả theo người xem: thiếu phiên thì chủ tin không mở được nháp của mình (404).
  it('đã đăng nhập: bảng tin và tin tương tự kèm phiên; khách gọi ẩn danh', async () => {
    const calls = serve({
      '/api/v1/listings': { items: [], nextCursor: null },
      [`/api/v1/listings/${wireListing.id}/suggestions`]: [],
    });
    setHttpAccessToken('tok-1');
    await api.searchListings(NO_FILTERS, loadLookups);
    await api.getSimilar(wireListing.id, loadLookups);
    setHttpAccessToken(null);
    await api.searchListings(NO_FILTERS, loadLookups);

    expect(calls.map((c) => c.authorization)).toEqual(['Bearer tok-1', 'Bearer tok-1', null]);
  });

  it('chi tiết: thông số theo đúng phiên bản mẫu, bỏ ô trống; số điện thoại chỉ khi người bán cho hiện', async () => {
    serve({
      [`/api/v1/listings/${wireListing.id}`]: wireListing,
      '/api/v1/users/u-1': {
        id: 'u-1',
        displayName: 'Anh Tuấn',
        avatarUrl: null,
        joinedAt: '2025-03-01T00:00:00.000Z',
        phone: { number: '0909123456', verified: false },
      },
      '/api/v1/categories/c-1/template/versions/1': {
        categoryId: 'c-1',
        version: 1,
        publishedAt: null,
        fields: [
          { name: 'mau', label: 'Màu', type: 'multi_choice', required: false },
          { name: 'hang', label: 'Hãng', type: 'single_choice', required: true },
          { name: 'ghi_chu', label: 'Ghi chú', type: 'text', required: false },
        ],
      },
    });

    const l = await api.getListing(wireListing.id, loadLookups);

    expect(l.specs).toEqual([
      { label: 'Màu', value: 'Đen, Bạc' },
      { label: 'Hãng', value: 'Apple' },
    ]);
    expect(l.seller).toMatchObject({ name: 'Anh Tuấn', phone: null, rating: null });
    expect(l.category).toEqual({ id: 'c-1', name: 'Nội thất' });
    expect(l).toMatchObject({ allowOffers: true, condition: null, views: null });
    expect(l.photos).toEqual([{ uri: 'https://img.test/1.jpg' }]);
  });

  it('tin của tôi bị máy giữ vì ảnh: câu chờ và từng câu sửa ảnh của server', async () => {
    serve({
      '/api/v1/me/listings': {
        items: [
          {
            ...wireListing,
            id: 'giu',
            state: 'pending',
            machineNotice: {
              kind: 'plain',
              message: 'Tin đang chờ người duyệt, thường trong 24 giờ',
              estimatedWait: 'Thường trong 24 giờ',
              lookupCode: null,
              fixes: [
                { code: 'image_too_dark', message: 'Ảnh 1 quá tối. Chụp lại ở nơi đủ sáng.' },
                { code: 'image_too_small', message: 'Ảnh 2 quá nhỏ. Thay bằng ảnh chụp rõ hơn.' },
              ],
            },
          },
        ],
        nextCursor: null,
      },
    });
    const [held] = await api.getMyListings(loadLookups);
    expect(held).toMatchObject({
      note: 'Tin đang chờ người duyệt, thường trong 24 giờ',
      fixes: [
        'Ảnh 1 quá tối. Chụp lại ở nơi đủ sáng.',
        'Ảnh 2 quá nhỏ. Thay bằng ảnh chụp rõ hơn.',
      ],
    });
  });

  it('tin của tôi: giữ trạng thái của server, bỏ tin đã gỡ; hồ sơ chưa có khu vực và đánh giá', async () => {
    const calls = serve({
      '/api/v1/me/listings': {
        items: [
          { ...wireListing, id: 'a', state: 'draft', expiresAt: null },
          { ...wireListing, id: 'b', state: 'live', expiresAt: '2026-11-01T00:00:00.000Z' },
          { ...wireListing, id: 'c', state: 'removed' },
          { ...wireListing, id: 'd', state: 'sold' },
        ],
        nextCursor: null,
      },
      '/api/v1/me': wireMe,
    });

    const mine = await api.getMyListings(loadLookups);
    expect(mine.map((l) => [l.id, l.state, l.expiresAt])).toEqual([
      ['a', 'draft', null],
      ['b', 'live', '2026-11-01T00:00:00.000Z'],
      ['d', 'sold', wireListing.expiresAt],
    ]);
    expect(calls[0]?.url.searchParams.get('limit')).toBe('100');

    await expect(api.getMe()).resolves.toMatchObject({
      name: 'Tài Nguyễn',
      memberSince: 2026,
      place: null,
      rating: null,
      verified: false,
      emailVerified: true,
      avatarUrl: null,
      opsAccess: false,
    });
  });

  it('lối vào bàn vận hành: staff có quyền hiệu lực hoặc master', async () => {
    serve({ '/api/v1/me': { ...wireMe, staff: true } });
    await expect(api.getMe()).resolves.toMatchObject({ opsAccess: true, isMaster: false });
    serve({ '/api/v1/me': { ...wireMe, role: 'master' } });
    await expect(api.getMe()).resolves.toMatchObject({ opsAccess: true, isMaster: true });
  });

  it('trang người bán: hồ sơ không lộ số điện thoại, tin đang hiển thị theo trang', async () => {
    const calls = serve({
      '/api/v1/users/u-1': {
        id: 'u-1',
        displayName: 'Chị Lan',
        avatarUrl: null,
        joinedAt: '2025-03-01T00:00:00.000Z',
        phone: { number: '0901234567', verified: false },
      },
      '/api/v1/users/u-1/listings': { items: [wireListing], nextCursor: null },
    });

    await expect(api.getSeller('u-1')).resolves.toMatchObject({
      id: 'u-1',
      name: 'Chị Lan',
      phone: null,
      joinedAt: '2025-03-01T00:00:00.000Z',
    });
    const cards = await api.getSellerListings('u-1', loadLookups);
    expect(cards.map((c) => c.id)).toEqual([wireListing.id]);
    expect(calls[1]?.url.searchParams.get('limit')).toBe('30');
  });
});

/** Server giả trả bản tin với `version` tăng dần; ghi lại method, đường dẫn, header máy và body. */
function record() {
  const calls: { method: string; path: string; device: string | null; body: unknown }[] = [];
  let version = 1;
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const req = input as Request;
    const text = await req.text();
    calls.push({
      method: req.method,
      path: new URL(req.url).pathname,
      device: req.headers.get('x-device-id'),
      body: text ? JSON.parse(text) : null,
    });
    return new Response(
      JSON.stringify({ success: true, data: { ...wireListing, id: 'l-1', version: version++ } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  });
  return calls;
}

/** Đúng hình dạng một hội thoại của `GET /me/conversations/{id}` (ghim-server `89c7daa`). */
const wireConversation = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  kind: 'listing',
  listing: {
    id: wireListing.id,
    title: 'Bàn học gỗ sồi',
    price: 300000,
    negotiable: true,
    state: 'live',
    cover: { id: 'i-1', url: 'https://img.test/1.jpg' },
  },
  group: null,
  role: 'buyer',
  counterpart: {
    kind: 'account',
    accountId: 'u-1',
    displayName: 'Anh Tuấn',
    avatarUrl: null,
    gone: false,
    activity: { online: true, lastActiveAt: '2026-10-18T10:41:00.000Z' },
  },
  lastMessage: null,
  unreadCount: 0,
  locked: false,
  canSend: true,
  canOffer: true,
  createdAt: '2026-10-18T10:00:00.000Z',
  lastActivityAt: '2026-10-18T10:00:00.000Z',
  ...overrides,
});
const wireMessage = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  conversationId: 'c-1',
  senderId: 'u-me',
  fromMe: true,
  kind: 'text',
  body: `Tin ${id}`,
  offer: null,
  createdAt: '2026-10-18T10:00:00.000Z',
  ...overrides,
});

describe('tin nhắn', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hội thoại về tin: tin nhắn theo thứ tự gửi, đề nghị giá, trạng thái hoạt động, trả giá được', async () => {
    serve({
      '/api/v1/me/conversations/c-1': wireConversation(),
      // Server trả mới trước.
      '/api/v1/me/conversations/c-1/messages': {
        items: [
          wireMessage('m2', {
            fromMe: false,
            senderId: 'u-1',
            kind: 'offer',
            body: '',
            offer: { amount: 250000, status: 'pending', respondedAt: null },
          }),
          wireMessage('m1'),
        ],
        nextCursor: null,
      },
    });

    const c = await api.getConversation('c-1');

    expect(c.messages).toEqual([
      { id: 'm1', kind: 'text', mine: true, text: 'Tin m1', at: '2026-10-18T10:00:00.000Z' },
      {
        id: 'm2',
        kind: 'offer',
        mine: false,
        amount: 250000,
        status: 'pending',
        at: '2026-10-18T10:00:00.000Z',
      },
    ]);
    expect(c).toMatchObject({
      kind: 'listing',
      peer: { id: 'u-1', name: 'Anh Tuấn', activity: { online: true } },
      listing: { title: 'Bàn học gỗ sồi', price: 300000, cover: { uri: 'https://img.test/1.jpg' } },
      isSeller: false,
      canOffer: true,
      readOnly: null,
    });
  });

  it('hội thoại với Hỗ trợ Ghim: bên kia là đội, không gắn tin; có chặn thì chỉ còn để đọc', async () => {
    serve({
      '/api/v1/me/conversations': {
        items: [
          wireConversation({
            id: 'c-2',
            kind: 'support',
            listing: null,
            counterpart: {
              kind: 'support',
              accountId: null,
              displayName: 'Hỗ trợ Ghim',
              avatarUrl: null,
              gone: false,
              activity: null,
            },
            lastMessage: wireMessage('m9', { fromMe: false, senderId: null, body: 'Chào bạn' }),
            unreadCount: 2,
            canOffer: false,
          }),
          wireConversation({
            id: 'c-3',
            locked: true,
            canSend: false,
            lastMessage: wireMessage('m8', {
              kind: 'offer',
              body: '',
              offer: { amount: 250000, status: 'declined', respondedAt: null },
            }),
          }),
        ],
        nextCursor: null,
      },
    });

    const [support, locked] = await api.getConversations();

    expect(support).toMatchObject({
      kind: 'support',
      peer: { id: 'support', name: 'Hỗ trợ Ghim', activity: null },
      listing: null,
      lastMessage: 'Chào bạn',
      unread: 2,
    });
    expect(locked?.lastMessage).toBe('Bạn: Trả giá 250.000 đ');
  });

  it('chỉ còn để đọc: câu theo lý do, không nói ai chặn', async () => {
    serve({
      '/api/v1/me/conversations/c-1': wireConversation({
        locked: true,
        canSend: false,
        canOffer: false,
      }),
      '/api/v1/me/conversations/c-1/messages': { items: [], nextCursor: null },
    });
    await expect(api.getConversation('c-1')).resolves.toMatchObject({
      readOnly: 'Hội thoại này không nhận tin nhắn',
    });
  });
});

/** Đúng hình dạng một dòng của `GET /me/notifications` (ghim-server `89c7daa`). */
const wireNotice = (overrides: Record<string, unknown>) => ({
  id: 'n-1',
  category: 'messages',
  type: 'messaging.message.received',
  title: 'Bình Người Mua',
  body: 'Máy còn không anh?',
  detail: null,
  data: {},
  groupId: null,
  count: 1,
  readAt: null,
  createdAt: '2026-10-18T09:00:00.000Z',
  updatedAt: '2026-10-18T09:05:00.000Z',
  ...overrides,
});

describe('thông báo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tab, biểu tượng và màn mở theo nhóm, loại và mã của server; dòng gộp theo lần cập nhật cuối', async () => {
    serve({
      '/api/v1/me/notifications': {
        items: [
          wireNotice({ data: { conversationId: 'c-1', messageId: 'm-1', listingId: 'l-1' } }),
          wireNotice({
            id: 'n-2',
            type: 'messaging.offer.answered',
            body: 'Đã chấp nhận giá 12.000.000 ₫',
            data: { conversationId: 'c-1' },
            readAt: '2026-10-18T09:06:00.000Z',
          }),
          wireNotice({
            id: 'n-3',
            category: 'your_listings',
            type: 'listing.expiry.reminder',
            data: { listingId: 'l-1' },
          }),
          wireNotice({
            id: 'n-4',
            category: 'group_new_listings',
            type: 'listing.group.new',
            data: { listingId: 'l-2', groupId: 'g-1' },
          }),
          wireNotice({
            id: 'n-5',
            category: 'your_groups',
            type: 'group.state.locked',
            data: { groupId: 'g-1' },
            groupId: 'g-1',
          }),
          wireNotice({
            id: 'n-6',
            category: 'support',
            type: 'messaging.message.received',
            data: { conversationId: 'c-9' },
          }),
          wireNotice({
            id: 'n-7',
            category: 'trust_strikes',
            type: 'trust.strike.issued',
            title: 'Ghim',
            body: 'Bạn nhận một gậy thường liên quan tới tin «Xe đạp cũ».',
            detail: 'Điều Q1: Không đăng hàng cấm. Gậy thường 1 điểm, hết hạn ngày 20/01/2027.',
            data: { strikeId: 's-1', listingId: 'l-3' },
          }),
        ],
        page: 1,
        limit: 100,
        total: 7,
        totalPages: 1,
      },
    });

    const notices = await api.getNotices();

    expect(notices.map((n) => [n.id, n.tab, n.kind, n.target, n.read])).toEqual([
      ['n-1', 'deal', 'message', { screen: 'chat', id: 'c-1' }, false],
      ['n-2', 'deal', 'offer', { screen: 'chat', id: 'c-1' }, true],
      ['n-3', 'deal', 'expiring', { screen: 'profile' }, false],
      ['n-4', 'deal', 'listing', { screen: 'listing', id: 'l-2' }, false],
      ['n-5', 'system', 'group', { screen: 'group', id: 'g-1' }, false],
      ['n-6', 'system', 'message', { screen: 'chat', id: 'c-9' }, false],
      ['n-7', 'system', 'account', { screen: 'profile' }, false],
    ]);
    expect(notices[0]?.at).toBe('2026-10-18T09:05:00.000Z');
    // Phần chỉ xem trong app đi nguyên từ server; dòng không có thì null.
    expect(notices[6]?.detail).toBe(
      'Điều Q1: Không đăng hàng cấm. Gậy thường 1 điểm, hết hạn ngày 20/01/2027.',
    );
    expect(notices[0]?.detail).toBeNull();
  });

  it('đánh dấu đã đọc: theo mã, hay tất cả', async () => {
    const bodies: unknown[] = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      bodies.push(JSON.parse(await (input as Request).text()));
      return new Response(JSON.stringify({ success: true, data: { marked: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    await api.markNoticesRead(['n-1']);
    await api.markNoticesRead('all');
    expect(bodies).toEqual([{ ids: ['n-1'] }, { all: true }]);
  });
});

describe('lưu và gửi tin', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setHttpDeviceId(null);
  });

  it('ô bỏ trống thành null, thông số rỗng bị bỏ, nhóm cũ không sót lại trên tin sàn; lưu và gửi mang mã máy', async () => {
    setHttpDeviceId('may-1');
    const calls = record();

    const ref = await api.saveListing(
      { id: 'l-1', version: 3 },
      {
        title: '  ',
        description: '',
        price: 0,
        negotiable: true,
        categoryId: 'c-1',
        attributes: { hang: 'Apple', mau: [], ghi_chu: ' ' },
        provinceCode: 79,
        wardCode: null,
        imageIds: ['img-1'],
        placement: 'marketplace',
        groupId: 'g-cu',
        badgeGroupId: 'g-huy-hieu',
      },
    );
    await api.submitListing(ref);

    expect(calls[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/listings/l-1',
      device: 'may-1',
      body: {
        version: 3,
        title: null,
        description: null,
        price: null,
        categoryId: 'c-1',
        attributes: { hang: 'Apple' },
        provinceCode: 79,
        wardCode: null,
        imageIds: ['img-1'],
        placement: 'marketplace',
        groupId: null,
        badgeGroupId: 'g-huy-hieu',
      },
    });
    expect(ref).toEqual({ id: 'l-1', version: 1 });
    expect(calls[1]).toMatchObject({
      method: 'POST',
      path: '/api/v1/listings/l-1/submit',
      device: 'may-1',
      body: { version: 1 },
    });
  });
});

const myListing = (overrides: Partial<MyListing> = {}): MyListing => ({
  id: 'l-1',
  title: 'Bàn học gỗ sồi',
  price: 300000,
  cover: { uri: 'https://img.test/1.jpg' },
  place: { ward: null, province: 'Hà Nội' },
  postedAt: '2026-10-12T17:00:00.000Z',
  boosted: false,
  seller: null,
  groupName: null,
  state: 'live',
  views: null,
  saves: null,
  expiresAt: '2026-11-01T00:00:00.000Z',
  note: null,
  fixes: [],
  version: 4,
  renewal: null,
  moveUntil: null,
  ...overrides,
});

describe('hành động trên tin của tôi', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setHttpDeviceId(null);
  });

  it('chỉ hành động server nhận: rút khi chờ duyệt, gia hạn khi server mở, chuyển khi còn hạn; xoá luôn có', () => {
    const now = Date.parse('2026-10-20T00:00:00.000Z');
    expect(myListingActions(myListing({ state: 'pending' }), now)).toEqual(['withdraw', 'delete']);
    expect(myListingActions(myListing({ renewal: 'early' }), now)).toEqual(['renew', 'delete']);
    expect(myListingActions(myListing({ moveUntil: '2026-10-25T00:00:00.000Z' }), now)).toEqual([
      'move',
      'delete',
    ]);
    expect(myListingActions(myListing({ moveUntil: '2026-10-19T00:00:00.000Z' }), now)).toEqual([
      'delete',
    ]);
  });

  it('gia hạn mang phiên bản và mã máy, chuyển lên chợ chung mang mã máy, rút và xoá theo mã tin', async () => {
    setHttpDeviceId('may-1');
    const calls = record();
    const item = myListing();

    await api.actOnMyListing('withdraw', item);
    await api.actOnMyListing('renew', item);
    await api.actOnMyListing('move', item);
    await api.actOnMyListing('delete', item);

    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/listings/l-1/withdraw', device: null, body: null },
      { method: 'POST', path: '/api/v1/listings/l-1/renew', device: 'may-1', body: { version: 4 } },
      {
        method: 'POST',
        path: '/api/v1/listings/l-1/move-to-marketplace',
        device: 'may-1',
        body: {},
      },
      { method: 'DELETE', path: '/api/v1/listings/l-1', device: null, body: null },
    ]);
  });
});

describe('đăng ký và quên mật khẩu', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('email bỏ khoảng trắng, tên gọn lại; mật khẩu gửi nguyên văn; mã đi kèm đúng email', async () => {
    const calls = record();

    await api.register({ email: ' ban@vi-du.vn ', password: ' mat khau 1 ', displayName: ' Tài ' });
    await api.verifyEmail('ban@vi-du.vn ', '123456');
    await api.resendCode('ban@vi-du.vn');
    await api.forgotPassword(' ban@vi-du.vn');
    await api.resetPassword('ban@vi-du.vn', '654321', 'moi-12345678');

    expect(calls.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      {
        method: 'POST',
        path: '/api/v1/auth/register',
        body: { email: 'ban@vi-du.vn', password: ' mat khau 1 ', displayName: 'Tài' },
      },
      {
        method: 'POST',
        path: '/api/v1/auth/verify-email',
        body: { email: 'ban@vi-du.vn', code: '123456' },
      },
      { method: 'POST', path: '/api/v1/auth/resend-code', body: { email: 'ban@vi-du.vn' } },
      { method: 'POST', path: '/api/v1/auth/forgot-password', body: { email: 'ban@vi-du.vn' } },
      {
        method: 'POST',
        path: '/api/v1/auth/reset-password',
        body: { email: 'ban@vi-du.vn', code: '654321', password: 'moi-12345678' },
      },
    ]);
  });
});

describe('cài đặt', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('thiết bị và người đã chặn: đúng trường server trả; người đã xoá tài khoản không còn tên', async () => {
    const calls = serve({
      '/api/v1/me/sessions': [
        {
          id: 's-1',
          deviceName: 'iPhone của Tài',
          createdAt: '2026-10-01T00:00:00.000Z',
          lastActiveAt: '2026-10-20T00:00:00.000Z',
          current: true,
        },
      ],
      '/api/v1/me/blocks': {
        items: [{ accountId: 'u-2', displayName: null, blockedAt: '2026-10-19T00:00:00.000Z' }],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    });

    await expect(api.getSessions()).resolves.toEqual([
      {
        id: 's-1',
        deviceName: 'iPhone của Tài',
        lastActiveAt: '2026-10-20T00:00:00.000Z',
        current: true,
      },
    ]);
    await expect(api.getBlocks()).resolves.toEqual([
      { id: 'u-2', name: null, blockedAt: '2026-10-19T00:00:00.000Z' },
    ]);
    expect(calls[1]?.url.searchParams.get('limit')).toBe('100');
  });

  it('đổi mật khẩu, đăng xuất một máy hay mọi máy khác, gỡ chặn, xoá tài khoản', async () => {
    const calls = record();

    await api.changePassword('cu-12345678', 'moi-12345678');
    await api.revokeSession('s-2');
    await api.revokeSession('others');
    await api.unblock('u-2');
    await api.deleteAccount();

    expect(calls.map(({ method, path, body }) => ({ method, path, body }))).toEqual([
      {
        method: 'PUT',
        path: '/api/v1/me/password',
        body: { currentPassword: 'cu-12345678', newPassword: 'moi-12345678' },
      },
      { method: 'DELETE', path: '/api/v1/me/sessions/s-2', body: null },
      { method: 'DELETE', path: '/api/v1/me/sessions', body: null },
      { method: 'DELETE', path: '/api/v1/me/blocks/u-2', body: null },
      { method: 'DELETE', path: '/api/v1/me', body: null },
    ]);
  });
});

describe('báo cáo', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    setHttpDeviceId(null);
  });

  it('hội thoại: báo cáo bên kia mang mã máy; đang xem, thôi xem và xoá theo mã hội thoại', async () => {
    setHttpDeviceId('may-1');
    const calls = record();

    await api.reportConversation('c-1', 'harassment');
    await api.setConversationViewing('c-1', true);
    await api.setConversationViewing('c-1', false);
    await api.deleteConversation('c-1');

    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/api/v1/me/conversations/c-1/reports',
        device: 'may-1',
        body: { category: 'harassment' },
      },
      { method: 'PUT', path: '/api/v1/me/conversations/c-1/viewing', device: null, body: null },
      { method: 'DELETE', path: '/api/v1/me/conversations/c-1/viewing', device: null, body: null },
      { method: 'DELETE', path: '/api/v1/me/conversations/c-1', device: null, body: null },
    ]);
  });

  it('báo cáo tin: đối tượng là tin, loại của server, mang mã máy', async () => {
    setHttpDeviceId('may-1');
    const calls = record();

    await api.reportListing('l-1', 'fraud');

    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/api/v1/reports',
      device: 'may-1',
      body: { subject: { kind: 'listing', listingId: 'l-1' }, category: 'fraud' },
    });
  });
});

/** Đúng hình dạng hồ sơ nhóm của `GET /groups/{groupId}` (ghim-server `616af63`). */
const wireGroup = (overrides: Record<string, unknown> = {}) => ({
  id: 'g-1',
  name: 'Phụ huynh lớp 5B',
  kind: 'school',
  mode: 'public_review',
  state: 'active',
  description: 'Trao đổi sách vở, đồng phục',
  memberCount: 42,
  visibility: 'full',
  boardStyle: 'grid',
  allowOutsiders: false,
  showNameOnMarketplace: false,
  code: null,
  lockedReason: null,
  units: [],
  membership: null,
  joinRequest: null,
  ...overrides,
});

const wireMembership = (role: string, badgeEligible: boolean) => ({
  role,
  unitId: null,
  moderatorUnitId: null,
  joinedVia: 'approved',
  joinedAt: '2026-10-01T00:00:00.000Z',
  badgeEligible,
});

describe('nhóm', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hồ sơ đủ: chữ cái đầu thay ảnh, vai của người xem, đơn đang chờ của chính mình', async () => {
    serve({
      '/api/v1/groups/g-1': wireGroup({
        joinRequest: {
          id: 'r-1',
          createdAt: '2026-10-18T09:00:00.000Z',
          expiresAt: '2026-11-08T09:00:00.000Z',
        },
      }),
    });

    expect(await api.getGroup('g-1')).toEqual({
      visible: true,
      id: 'g-1',
      name: 'Phụ huynh lớp 5B',
      initials: 'PH',
      mode: 'public_review',
      state: 'active',
      memberCount: 42,
      description: 'Trao đổi sách vở, đồng phục',
      boardStyle: 'grid',
      allowOutsiders: false,
      lockedReason: null,
      role: null,
      badgeEligible: false,
      joinRequest: { id: 'r-1', expiresAt: '2026-11-08T09:00:00.000Z' },
    });
  });

  it('người ngoài nhóm riêng tư chỉ có tên', async () => {
    serve({
      '/api/v1/groups/g-2': {
        visibility: 'name_only',
        id: 'g-2',
        name: 'Lớp 12A1',
        joinRequest: null,
      },
    });

    expect(await api.getGroup('g-2')).toEqual({
      visible: false,
      id: 'g-2',
      name: 'Lớp 12A1',
      initials: 'L1',
      joinRequest: null,
    });
  });

  it('nhóm của tôi mang vai và quyền mang huy hiệu; lời mời mang chữ cái đầu', async () => {
    const { visibility: _v, boardStyle: _b, allowOutsiders: _a, ...summary } = wireGroup();
    serve({
      '/api/v1/me/groups': [{ ...summary, membership: wireMembership('moderator', true) }],
      '/api/v1/me/group-invitations': {
        invitations: [
          {
            id: 'i-1',
            groupId: 'g-3',
            groupName: 'Công ty ABC',
            unitId: null,
            expiresAt: '2026-11-01T00:00:00.000Z',
          },
        ],
        rosters: [{ groupId: 'g-4', groupName: 'THPT Hùng Vương', unitId: null }],
      },
    });

    expect(await api.getMyGroups()).toEqual([
      expect.objectContaining({
        id: 'g-1',
        initials: 'PH',
        role: 'moderator',
        badgeEligible: true,
      }),
    ]);
    expect(await api.getGroupInvites()).toEqual({
      invitations: [
        {
          id: 'i-1',
          groupId: 'g-3',
          groupName: 'Công ty ABC',
          initials: 'CT',
          expiresAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      rosters: [{ groupId: 'g-4', groupName: 'THPT Hùng Vương', initials: 'TH' }],
    });
  });

  it('vào nhóm: mã đi kèm khi có, kết quả là vào ngay hay thành đơn', async () => {
    const bodies: unknown[] = [];
    jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      bodies.push(JSON.parse(await (input as Request).text()));
      const data =
        bodies.length === 1
          ? { result: 'member', membership: wireMembership('member', false) }
          : { result: 'request', request: { id: 'r-2', status: 'pending' } };
      return new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    await expect(api.joinGroup('g-1')).resolves.toBe('member');
    await expect(api.joinGroup('g-2', 'K7Q2PX')).resolves.toBe('request');
    expect(bodies).toEqual([{}, { code: 'K7Q2PX' }]);
  });

  it('đăng trong nhóm: giữ nhóm, bỏ huy hiệu — server từ chối huy hiệu trên tin trong nhóm', async () => {
    const calls = record();
    await api.saveListing(
      { id: 'l-1', version: 3 },
      {
        title: 'Sách lớp 5',
        description: '',
        price: 50_000,
        negotiable: false,
        categoryId: 'c-1',
        attributes: {},
        provinceCode: 79,
        wardCode: null,
        imageIds: [],
        placement: 'members_only',
        groupId: 'g-1',
        badgeGroupId: 'g-1',
      },
    );

    expect(calls[0]?.body).toMatchObject({
      placement: 'members_only',
      groupId: 'g-1',
      badgeGroupId: null,
    });
  });
});

describe('unwrap', () => {
  it('trả data khi vỏ success', async () => {
    const result = unwrap(
      Promise.resolve({
        data: { success: true as const, data: { database: 'up' } },
        response: response(200),
      }),
    );
    await expect(result).resolves.toEqual({ database: 'up' });
  });

  it('đọc vỏ success nằm ở nhánh error (503 của readiness)', async () => {
    const result = unwrap(
      Promise.resolve({
        error: { success: true, data: { database: 'down' } },
        response: response(503),
      }),
    );
    await expect(result).resolves.toEqual({ database: 'down' });
  });

  it('đổi vỏ lỗi thành ApiError giữ code, message, status, details', async () => {
    const result = unwrap(
      Promise.resolve({
        error: {
          success: false,
          error: {
            code: 'EMAIL_TAKEN',
            message: 'Email đã có tài khoản',
            details: { field: 'email' },
          },
        },
        response: response(409),
      }),
    );
    await expect(result).rejects.toMatchObject({
      name: 'ApiError',
      code: 'EMAIL_TAKEN',
      message: 'Email đã có tài khoản',
      status: 409,
      details: { field: 'email' },
    });
    await expect(result).rejects.toBeInstanceOf(ApiError);
  });

  it('không có vỏ (mạng đứt, proxy trả HTML) thì là NETWORK_ERROR', async () => {
    const result = unwrap(Promise.resolve({ error: new TypeError('Network request failed') }));
    await expect(result).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });

  it('giữ nguyên ApiError mà lượt làm mới phiên ném qua fetch', async () => {
    const revoked = new ApiError('SESSION_REVOKED', 'Phiên đã bị thu hồi, đăng nhập lại', 401);
    await expect(unwrap(Promise.resolve({ error: revoked }))).rejects.toBe(revoked);
  });
});

describe('unwrapEmpty', () => {
  it('204 là thành công dù không có vỏ', async () => {
    await expect(
      unwrapEmpty(Promise.resolve({ data: {}, response: response(204) })),
    ).resolves.toBeUndefined();
  });

  it('thất bại vẫn đọc vỏ lỗi thành ApiError', async () => {
    const result = unwrapEmpty(
      Promise.resolve({
        error: { success: false, error: { code: 'UNAUTHORIZED', message: 'Cần đăng nhập' } },
        response: response(401),
      }),
    );
    await expect(result).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});
