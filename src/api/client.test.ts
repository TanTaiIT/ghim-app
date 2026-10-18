import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { api, NO_FILTERS, unwrap, unwrapEmpty, type Lookups } from './client';
import { ApiError, setHttpDeviceId } from './http';

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

/** Server giả theo đường dẫn; ghi lại query string của từng lượt gọi. */
function serve(routes: Record<string, unknown>) {
  const urls: URL[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL((input as Request).url);
    urls.push(url);
    const data = routes[url.pathname];
    return new Response(
      JSON.stringify(data === undefined ? { success: false } : { success: true, data }),
      {
        status: data === undefined ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  });
  return urls;
}

describe('đọc tin đăng từ server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('thẻ tin: tra tên khu vực qua lookups, ảnh đầu làm bìa, chưa có người bán; bộ lọc thành query', async () => {
    const urls = serve({ '/api/v1/listings': { items: [wireListing], nextCursor: null } });
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
    expect(urls[0]?.searchParams.get('q')).toBe('bàn');
    expect(urls[0]?.searchParams.get('provinceCode')).toBe('1');
    expect(urls[0]?.searchParams.has('categoryId')).toBe(false);
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

    const l = await api.getListing(wireListing.id, async () => lookups);

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
    const urls = serve({
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

    const mine = await api.getMyListings(async () => lookups);
    expect(mine.map((l) => [l.id, l.state, l.expiresAt])).toEqual([
      ['a', 'draft', null],
      ['b', 'live', '2026-11-01T00:00:00.000Z'],
      ['d', 'sold', wireListing.expiresAt],
    ]);
    expect(urls[0]?.searchParams.get('limit')).toBe('100');

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
