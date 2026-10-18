import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { api, NO_FILTERS, unwrap, unwrapEmpty, type Lookups } from './client';
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
      '/api/v1/me': {
        id: 'u-1',
        displayName: 'Tài Nguyễn',
        avatarUrl: null,
        joinedAt: '2026-10-18T00:00:00.000Z',
        phone: null,
        email: 'app.dev@ghim.local',
        emailVerified: true,
        role: 'user',
        twoFactorEnabled: false,
        nameHidden: false,
      },
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
    });
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

  it('nhắn quản trị một nhóm mẫu (mã không phải uuid): báo chưa có, không gọi server', async () => {
    const urls = serve({});
    await expect(api.openConversation({ kind: 'group', id: 'g-na' })).rejects.toMatchObject({
      code: 'NOT_AVAILABLE',
    });
    expect(urls).toEqual([]);
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
          }),
          wireNotice({
            id: 'n-6',
            category: 'support',
            type: 'messaging.message.received',
            data: { conversationId: 'c-9' },
          }),
        ],
        page: 1,
        limit: 100,
        total: 6,
        totalPages: 1,
      },
    });

    const notices = await api.getNotices();

    expect(notices.map((n) => [n.id, n.tab, n.kind, n.target, n.read])).toEqual([
      ['n-1', 'deal', 'message', { screen: 'chat', id: 'c-1' }, false],
      ['n-2', 'deal', 'offer', { screen: 'chat', id: 'c-1' }, true],
      ['n-3', 'deal', 'expiring', { screen: 'profile' }, false],
      ['n-4', 'deal', 'listing', { screen: 'listing', id: 'l-2' }, false],
      ['n-5', 'system', 'group', null, false],
      ['n-6', 'system', 'message', { screen: 'chat', id: 'c-9' }, false],
    ]);
    expect(notices[0]?.at).toBe('2026-10-18T09:05:00.000Z');
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

  it('ô bỏ trống thành null, thông số rỗng bị bỏ, luôn lên toàn sàn; lưu và gửi đều mang mã máy', async () => {
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
